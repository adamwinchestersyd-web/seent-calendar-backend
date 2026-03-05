// CACHE BUST v16 - TIMEOUTS & DEBUGGING
import dotenv from "dotenv";
dotenv.config();
import fs from "fs/promises";
import path from "path";
import cron from "node-cron";
import cors from "cors";
import fetch from "node-fetch";
import qs from "querystring";
import express from "express";

const app = express(); 

// --- CONFIGURATION ---
function parseAllowlist(raw) {
  if (typeof raw !== "string") return [];
  return raw.split(",").map(v => v.trim()).filter(Boolean);
}

const allowList = parseAllowlist(process.env.FRONTEND_ORIGIN);
const devFallback = "http://localhost:5173";
if (allowList.length === 0) allowList.push(devFallback);

// --- MIDDLEWARE (Order Matters) ---
// 1. Enable CORS
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowList.includes(origin)) return cb(null, true);
    if (origin.startsWith("http://localhost:5173")) return cb(null, true);
    if (origin.endsWith(".onrender.com")) return cb(null, true);
    if (origin.endsWith(".zoho.com")) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ["GET","POST","PATCH","OPTIONS","DELETE"],
  allowedHeaders: ["Content-Type","Authorization", "x-webhook-secret"], // Added webhook header
  maxAge: 600,
}));

// 2. Webhook Parsers (UrlEncoded MUST be extended: true for Zoho)
app.use(express.urlencoded({ extended: true, limit: "10mb" })); 
app.use(express.json({ limit: "10mb" }));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

const _BOOT_PORT = Number(process.env.PORT) || 4000;
app.listen(_BOOT_PORT, "0.0.0.0", () => {
  console.log(`[api] listening on http://localhost:${_BOOT_PORT}`);
});

// --- CONSTANTS ---
const DATA_DIR = path.join(process.cwd(), "data");
const CASES_PATH = path.join(DATA_DIR, "cases.json");
const PRUNE_DAYS = 30;
const ZOHO_ORG_ID = process.env.ZOHO_ORG_ID || "org640578001"; 
const ZOHO_PORTAL_ID = process.env.ZOHO_PORTAL_ID; 
const ZOHO_DEFAULT_PROJECT_ID = process.env.ZOHO_DEFAULT_PROJECT_ID;

const ACCOUNTS_HOST = process.env.ZOHO_ACCOUNTS_HOST || "https://accounts.zoho.com";
let   ZOHO_DOMAIN   = process.env.ZOHO_DOMAIN || "https://www.zohoapis.com";

const CLIENT_ID     = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const REDIRECT_URI  = process.env.ZOHO_REDIRECT_URI;

const ZOHO_FULL_SCOPE = "ZohoCRM.modules.ALL,ZohoCRM.users.READ,ZohoProjects.projects.ALL,ZohoCreator.report.READ,ZohoCreator.report.UPDATE,ZohoCreator.report.DELETE,ZohoCreator.form.CREATE";
const ZOHO_WEBHOOK_SECRET = process.env.ZOHO_WEBHOOK_SECRET; 
const { CREATOR_APP_OWNER, CREATOR_APP_NAME, CREATOR_FORM_NAME, CREATOR_REPORT_NAME } = process.env;

let REFRESH_TOKEN     = process.env.ZOHO_REFRESH_TOKEN || null;
let ACCESS_TOKEN      = null;
let ACCESS_EXPIRES_AT = 0;


// ==========================================
// UTILITIES & TIMEOUTS
// ==========================================

// Helper to fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal  
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

function localYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toYMD(v) {
  if (!v) return "";
  if (typeof v === "string") {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s.slice(0, 10))) return s.slice(0, 10);
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? "" : localYMD(d);
  }
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? "" : localYMD(d);
}

function toCreatorDate(ymdString) {
  if (!ymdString) return "";
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(ymdString) ? ymdString + "T00:00:00" : ymdString;
  const d = new Date(safe); 
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`; 
}

const toStringSafe = (v) => {
  if (v == null) return "";
  if (Array.isArray(v)) return toStringSafe(v[0]);
  if (typeof v === "object") {
    const fullName = [v.first_name, v.last_name].filter(Boolean).join(" ").trim();
    return (
      (typeof v.name === "string" && v.name) ||
      (typeof v.display_value === "string" && v.display_value) ||
      (fullName && fullName) || ""
    );
  }
  return String(v);
};

const asName = (v) => toStringSafe(v).trim();
const firstWord = (v) => toStringSafe(v).trim().split(/\s+/)[0] || "";


// ==========================================
// AUTHENTICATION
// ==========================================

async function getAccessToken() {
  if (!REFRESH_TOKEN) throw new Error("No REFRESH_TOKEN available.");
  
  const now = Date.now();
  if (ACCESS_TOKEN && now < ACCESS_EXPIRES_AT - 60_000) return ACCESS_TOKEN;

  try {
    const r = await fetchWithTimeout(`${ACCOUNTS_HOST}/oauth/v2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: REFRESH_TOKEN,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "refresh_token",
        scope: ZOHO_FULL_SCOPE, 
      }).toString(),
    });

    const data = await r.json();

    if (!r.ok || !data.access_token) {
      console.error("[token] refresh error:", data);
      throw new Error(`Token refresh failed`);
    }

    if (typeof data.api_domain === "string" && data.api_domain) {
      ZOHO_DOMAIN = data.api_domain;
    }

    ACCESS_TOKEN = data.access_token;
    const expiresIn = Number(data.expires_in) || 3600;
    ACCESS_EXPIRES_AT = Date.now() + expiresIn * 1000;
    
    console.log("[token] refreshed successfully.");
    return ACCESS_TOKEN;
  } catch (e) {
    console.error("[token] Network error:", e.message);
    throw e;
  }
}


// ==========================================
// ZOHO CREATOR LOGIC
// ==========================================

async function fetchManualEntries() {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  const creatorApiUrl = `https://creator.zoho.com/api/v2/${CREATOR_APP_OWNER}/${CREATOR_APP_NAME}/report/${CREATOR_REPORT_NAME}`;

  try {
    const res = await fetchWithTimeout(creatorApiUrl, {
      headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
    });
    const data = await res.json();

    return (data.data || []).map(item => ({
      id: `creator_${item.ID}`, 
      title: item.Title,
      start: item.Start_Date ? toYMD(item.Start_Date) : '', 
      end: item.End_Date ? toYMD(item.End_Date) : '',     
      startTime: item.Start_Time,
      wipManager: item.WIP_Manager,
      caseOwner: item.Owner,
      installer: item.Installer,
      pmNotes: item.PM_Notes,
      state: item.State || "", 
      isManual: true, 
      created_time: item.Added_Time, 
      modified_time: item.Modified_Time,
    }));
  } catch (e) {
    console.error('[creator] fetch error:', e.message);
    return [];
  }
}

async function createManualEntry(eventData) {
  const accessToken = await getAccessToken();
  if (!accessToken) return { error: 'Could not get access token' };

  const creatorApiUrl = `https://creator.zoho.com/api/v2/${CREATOR_APP_OWNER}/${CREATOR_APP_NAME}/form/${CREATOR_FORM_NAME}`;

  const body = JSON.stringify({
    data: {
      "Title": eventData.title,
      "WIP_Manager": eventData.wipManager,
      "Owner": eventData.caseOwner,
      "Installer": eventData.installer,
      "PM_Notes": eventData.pmNotes,
      "Start_Date": toCreatorDate(eventData.start), 
      "End_Date": toCreatorDate(eventData.end),   
      "Start_Time": eventData.startTime,
      "State": eventData.state, 
    }
  });

  try {
    const res = await fetchWithTimeout(creatorApiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}`, 'Content-Type': 'application/json' },
      body: body,
    });
    const data = await res.json();
    
    if (data.code === 3000) { 
      return { success: true, id: data.data.ID };
    } else {
      console.error('[creator] Create error:', data);
      return { error: 'Failed', details: data };
    }
  } catch (e) {
    console.error('[creator] create fetch error:', e.message);
    return { error: e.message };
  }
}

async function updateManualEntry(creatorId, eventData) {
  const accessToken = await getAccessToken();
  if (!accessToken) return { error: 'Could not get access token' };

  // Strip "creator_" prefix
  const realId = creatorId.replace("creator_", "");

  // Zoho Creator V2 Report Endpoint for Updates
  const url = `https://creator.zoho.com/api/v2/${CREATOR_APP_OWNER}/${CREATOR_APP_NAME}/report/${CREATOR_REPORT_NAME}/${realId}`;

  // Map internal field names to Zoho Creator field names
  const payload = {
    data: {
      ...(eventData.title && { "Title": eventData.title }),
      ...(eventData.wipManager && { "WIP_Manager": eventData.wipManager }),
      ...(eventData.caseOwner && { "Owner": eventData.caseOwner }),
      ...(eventData.installer && { "Installer": eventData.installer }),
      ...(eventData.pmNotes && { "PM_Notes": eventData.pmNotes }),
      ...(eventData.start && { "Start_Date": toCreatorDate(eventData.start) }),
      ...(eventData.end && { "End_Date": toCreatorDate(eventData.end) }),
      ...(eventData.startTime && { "Start_Time": eventData.startTime }),
      ...(eventData.state && { "State": eventData.state }),
    }
  };

  try {
    const res = await fetchWithTimeout(url, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    
    // Zoho V2 success code is often 3000
    if (data.code === 3000) {
      console.log(`[creator] Updated ${realId} successfully.`);
      return { success: true };
    } else {
      console.error('[creator] Update failed:', data);
      return { error: 'Update failed', details: data };
    }
  } catch (e) {
    console.error('[creator] update fetch error:', e.message);
    return { error: e.message };
  }
}

// ==========================================
// ZOHO PROJECT LOGIC
// ==========================================

async function updateProjectsTask(caseData) {
  console.log(`[Projects Sync] Received update for Case ID: ${caseData.case_id}`);
  console.log('[Projects Sync] Data:', caseData);
  return { success: true };
}


// ==========================================
// ZOHO CRM LOGIC
// ==========================================

async function updateCaseInZoho(caseId, start, end) {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  const crmApiUrl = `${ZOHO_DOMAIN}/crm/v2/Cases/${caseId}`;
  const body = JSON.stringify({
    data: [{
      "Install_Date": toYMD(start),
      "Install_End_Date": toYMD(end),
      "Sync_Source": "widget" 
    }]
  });

  try {
    const res = await fetchWithTimeout(crmApiUrl, {
      method: 'PUT',
      headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}`, 'Content-Type': 'application/json' },
      body: body,
    });
    const data = await res.json();
    if (data.data && data.data[0].status === 'success') {
      console.log(`[cases] Updated case ${caseId} successfully.`);
      return true;
    }
    console.error(`[cases] Failed to update case ${caseId}:`, data);
    return false;
  } catch (e) {
    console.error('[cases] update error:', e.message);
    return false;
  }
}

// Fetch Cases (With Pagination + Timeouts)
async function fetchCasesFromZoho() {
  const token = await getAccessToken(); 
  const fields = [
    "id", "Subject", "Install_Date", "Install_End_Date", "Install_Start_Time",
    "Due_Date", "State", "Owner", "Case_Number", "Description", "WIP_Manager",
    "WIP_Manager1", "Installer", "Modified_Time", "Created_Time"
  ].join(",");

  let allRows = [];
  let page = 1;
  let hasMore = true;
  
  const baseUrl = `${ZOHO_DOMAIN}/crm/v2/Cases?fields=${encodeURIComponent(fields)}&sort_by=Modified_Time&sort_order=desc`;

  while (hasMore) {
    const url = `${baseUrl}&per_page=200&page=${page}`;
    console.log(`[cases] Fetching page ${page}...`);
    
    try {
        const r = await fetchWithTimeout(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
        if (!r.ok) {
            console.warn(`[cases] Page ${page} failed: ${r.status}`);
            break;
        }

        const json = await r.json();
        const rows = json.data || [];
        allRows = allRows.concat(rows);

        // Stop if we get a short page or hit limit
        if (rows.length < 200 || page >= 5) {
            hasMore = false;
        } else {
            page++;
        }
    } catch (e) {
        console.error(`[cases] Error fetching page ${page}: ${e.message}`);
        break; // Stop on network error
    }
  }
  
  console.log(`[cases] Total rows fetched: ${allRows.length}`);

  return allRows.map((row) => {
    const wipMgrName = asName(row.WIP_Manager1) || asName(row.WIP_Manager);
    const installerName = asName(row.Installer) || asName(row.WIP_Manager);
    const ownerFirst = firstWord(row.Owner);

    return {
      id: row.id,
      title: row.Subject || `Case ${row.Case_Number || ""}`,
      start: toYMD(row.Install_Date) || toYMD(row.Due_Date) || toYMD(row.Created_Time),
      end: (() => {
        if (row.Install_Date) {
          return toYMD(row.Install_End_Date) || toYMD(row.Install_Date);
        }
        const fallbackStart = toYMD(row.Due_Date) || toYMD(row.Created_Time);
        if (!fallbackStart) return "";
        const d = new Date(fallbackStart + "T00:00:00");
        d.setDate(d.getDate() + 1);
        return localYMD(d);
      })(),
      startTime: row.Install_Start_Time || "",
      state: row.State || "",
      wipManager: wipMgrName,
      installer: installerName,
      caseOwner: ownerFirst,
      pmNotes: (row.Description || "").slice(0, 200),
      caseUrl: row.id ? `https://crm.zoho.com/crm/${ZOHO_ORG_ID}/tab/Cases/${row.id}` : "",
      created_time: row.Created_Time,
      modified_time: row.Modified_Time,
      isManual: false,
    };
  });
}

// Lists Helpers
async function fetchAllCrmUsers() {
  const token = await getAccessToken(); 
  const url = `${ZOHO_DOMAIN}/crm/v2/users?type=ActiveUsers`;
  const r = await fetchWithTimeout(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  if (!r.ok) return [];
  const { users = [] } = await r.json();
  return Array.from(new Set(users.map(user => firstWord(user.full_name)))).sort();
}

async function fetchAllServiceAgents() {
  const token = await getAccessToken();
  const url = `${ZOHO_DOMAIN}/crm/v2/Service_Agents?fields=Name`;
  const r = await fetchWithTimeout(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  if (!r.ok) return [];
  const { data = [] } = await r.json();
  return data.map(record => record["Name"]).sort();
}


// ==========================================
// CACHE & REFRESH LOGIC
// ==========================================

let CASES_CACHE = { events: [], lastUpdated: 0 };

async function writeJSONAtomic(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, file);
}

async function readJSONSafe(file, fallback) {
  try {
    const txt = await fs.readFile(file, "utf-8");
    return JSON.parse(txt);
  } catch {
    return fallback;
  }
}

function pruneOld(events) {
  const cutoff = Date.now() - PRUNE_DAYS * 24 * 60 * 60 * 1000;
  return events.filter((e) => {
    const key = e.end || e.start || e.created_time;
    const t = key ? new Date(key).getTime() : 0;
    return t === 0 || t >= cutoff;
  });
}

async function loadCacheOnBoot() {
  const file = await readJSONSafe(CASES_PATH, { events: [], lastUpdated: 0 });
  CASES_CACHE = {
    events: Array.isArray(file.events) ? file.events : [],
    lastUpdated: Number(file.lastUpdated) || 0,
  };
}
const _cacheReady = loadCacheOnBoot();

async function persistCache() {
  const payload = { events: CASES_CACHE.events, lastUpdated: Date.now() };
  await writeJSONAtomic(CASES_PATH, payload);
  CASES_CACHE.lastUpdated = payload.lastUpdated;
}

async function refreshCases(reason = "manual") {
  console.log(`[cases] refresh starting (${reason})`);
  try {
    const [crmCases, manualEntries] = await Promise.all([
      fetchCasesFromZoho(),
      fetchManualEntries()
    ]);

    const prunedCrm = pruneOld(crmCases);
    const prunedCreator = pruneOld(manualEntries);

    CASES_CACHE.events = [...prunedCrm, ...prunedCreator];
    await persistCache();
    
    console.log(`[cases] refresh ok (${reason}) events=${CASES_CACHE.events.length}`);
    return { ok: true, count: CASES_CACHE.events.length, lastUpdated: CASES_CACHE.lastUpdated };
  } catch (e) {
    console.error("[cases] refresh error:", e);
    return { ok: false, error: String(e) };
  }
}


// ==========================================
// ROUTES
// ==========================================

app.get("/oauth/callback", async (req, res) => {
  res.send("Token logic active.");
});

app.get("/api/cases", (_req, res) => {
  res.json(CASES_CACHE.events);
});

app.post("/api/cases/refresh", async (_req, res) => {
  const out = await refreshCases("manual");
  res.status(out.ok ? 200 : 500).json(out);
});

app.patch("/api/cases/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const eventData = req.body;
    const { start, end } = eventData;
    let found = false;
    
    CASES_CACHE.events = CASES_CACHE.events.map((e) => {
      if (e.id !== id) return e;
      found = true;
      return { ...e, ...eventData, modified_time: new Date().toISOString() };
    });

    if (!found) return res.status(404).json({ ok: false, error: "Not found" });
    await persistCache();

    if (id.startsWith('creator_')) {
       await updateManualEntry(id, eventData);
    } else {
       updateCaseInZoho(id, start, end); 
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/api/manual-entry", async (req, res) => {
  const eventData = req.body;
  const result = await createManualEntry(eventData);
  if (result.success) {
    refreshCases("post-create");
    res.status(201).json({ status: 'success', id: result.id });
  } else {
    res.status(500).json({ error: 'Failed', details: result.details });
  }
});

// Lists
app.get("/api/lists/users", async (_req, res) => {
  try {
    const users = await fetchAllCrmUsers();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.get("/api/lists/service-agents", async (_req, res) => {
  try {
    const agents = await fetchAllServiceAgents();
    res.json(agents);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Webhooks
app.post("/api/webhook/crm-case-updated", async (req, res) => {
  const secret = req.headers['x-webhook-secret'];
  if (!ZOHO_WEBHOOK_SECRET || secret !== ZOHO_WEBHOOK_SECRET) return res.status(401).send('Unauthorized');

  // DEBUG LOGGING
  console.log('[Webhook CRM] Content-Type:', req.headers['content-type']);
  console.log('[Webhook CRM] Raw Body:', req.body);
  
  const data = req.body;
  if (!data || Object.keys(data).length === 0) {
      console.warn('[Webhook CRM] Empty payload received. Check Zoho config.');
  }

  if (data.sync_source === 'projects') return res.status(200).send('Loop prevented');

  try {
    await updateProjectsTask(data);
    refreshCases("webhook-crm").catch(e => console.error("Webhook refresh failed:", e));
    res.status(200).send('Webhook received');
  } catch (e) {
    res.status(500).send('Error');
  }
});


// --- MISSING ROUTE: UPDATE MANUAL ENTRY ---
app.patch("/api/manual-entry/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const eventData = req.body;

    console.log(`[manual-entry] Patching ${id}`, eventData);

    // 1. Update Zoho Creator
    const result = await updateManualEntry(id, eventData);
    
    if (result.error) {
      return res.status(500).json(result);
    }

    // 2. Update Local Cache
    let found = false;
    CASES_CACHE.events = CASES_CACHE.events.map((e) => {
      if (e.id !== id) return e;
      found = true;
      return { ...e, ...eventData, modified_time: new Date().toISOString() };
    });

    if (found) await persistCache();

    res.json({ success: true });
  } catch (e) {
    console.error("Patch manual entry error:", e);
    res.status(500).json({ error: String(e) });
  }
});

// --- MISSING ROUTE: DELETE MANUAL ENTRY ---
app.delete("/api/manual-entry/:id", async (req, res) => {
  try {
    let { id } = req.params;
    const realId = id.replace("creator_", "");
    
    console.log(`[manual-entry] Deleting ${id}`);

    const accessToken = await getAccessToken();
    const url = `https://creator.zoho.com/api/v2/${CREATOR_APP_OWNER}/${CREATOR_APP_NAME}/report/${CREATOR_REPORT_NAME}/${realId}`;

    const response = await fetchWithTimeout(url, {
      method: 'DELETE',
      headers: { 'Authorization': `Zoho-oauthtoken ${accessToken}` }
    });

    const data = await response.json();
    
    if (data.code === 3000) {
      // Remove from cache
      CASES_CACHE.events = CASES_CACHE.events.filter(e => e.id !== id);
      await persistCache();
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to delete", details: data });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

if (process.env.NODE_ENV === "production") {
  const publicDir = path.resolve(process.cwd(), "dist", "public");
  app.use(express.static(publicDir, { maxAge: "1h" }));
  app.use((_req, res, next) => {
    if (res.headersSent) return next();
    if (_req.path === "/healthz") return next();
    if (/\.\w+$/.test(_req.path)) return next();
    const indexPath = path.join(publicDir, "index.html");
    res.sendFile(indexPath, (err) => {
      if (err) next();
    });
  });
}

_cacheReady.then(() => {
  cron.schedule("*/10 * * * *", () => refreshCases("cron"));
  refreshCases("boot").catch(() => {});
}).catch(() => {
  cron.schedule("*/10 * * * *", () => refreshCases("cron"));
  refreshCases("boot").catch(() => {});
});