// CACHE BUST v9
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

function parseAllowlist(raw) {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map(v => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
}

const allowList = parseAllowlist(process.env.FRONTEND_ORIGIN)
const devFallback = "http://localhost:5173";
if (allowList.length === 0) allowList.push(devFallback);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowList.includes(origin)) return cb(null, true);
    if (origin.startsWith("http://localhost:5173")) return cb(null, true);
    return cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ["GET","POST","PATCH","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  maxAge: 600,
}));

// --- UPDATED: Split parsers ---
// Use express.json() for our frontend API calls
app.use(express.json());
// Use urlencoded (for Zoho Webhooks)
app.use(express.urlencoded({ extended: true })); 
// ---

const DATA_DIR = path.join(process.cwd(), "data");
const CASES_PATH = path.join(DATA_DIR, "cases.json");
const PRUNE_DAYS = 30;
const ZOHO_ORG_ID = process.env.ZOHO_ORG_ID || "org640578001"; 

// ---- Zoho OAuth config + in-memory tokens -----------------------
const ACCOUNTS_HOST = process.env.ZOHO_ACCOUNTS_HOST || "https://accounts.zoho.com";
let   ZOHO_DOMAIN   = process.env.ZOHO_DOMAIN || "https://www.zohoapis.com";

const CLIENT_ID     = process.env.ZOHO_CLIENT_ID;
const CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
const REDIRECT_URI  = process.env.ZOHO_REDIRECT_URI;

const ZOHO_FULL_SCOPE = "ZohoCRM.modules.ALL,ZohoCRM.users.READ,ZohoProjects.projects.ALL,ZohoCreator.report.READ,ZohoCreator.form.CREATE";
const ZOHO_WEBHOOK_SECRET = process.env.ZOHO_WEBHOOK_SECRET; 

let REFRESH_TOKEN     = process.env.ZOHO_REFRESH_TOKEN || null;
let ACCESS_TOKEN      = null;
let ACCESS_EXPIRES_AT = 0;

// ----- Utilities (place once near top) -----
function toYMD(v) {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function toCreatorDate(ymdString) {
  if (!ymdString) return "";
  const d = new Date(ymdString); 
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
    const fullName =
      [v.first_name, v.last_name].filter(Boolean).join(" ").trim();
    return (
      (typeof v.name === "string" && v.name) ||
      (typeof v.display_value === "string" && v.display_value) ||
      (fullName && fullName) ||
      ""
    );
  }
  return String(v);
};

const asName = (v) => toStringSafe(v).trim();
const firstWord = (v) => toStringSafe(v).trim().split(/\s+/)[0] || "";


async function getAccessToken() {
  if (!REFRESH_TOKEN) {
    throw new Error("No REFRESH_TOKEN available. Run OAuth with access_type=offline & prompt=consent.");
  }
  const now = Date.now();
  if (ACCESS_TOKEN && now < ACCESS_EXPIRES_AT - 60_000) return ACCESS_TOKEN;

  const r = await fetch(`${ACCOUNTS_HOST}/oauth/v2/token`, {
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
    console.error("[token] refresh error payload:", { status: r.status, data, ACCOUNTS_HOST });
    throw new Error(`Token refresh failed (${r.status}) ${data.error || "No access_token returned"}`);
  }

  if (typeof data.api_domain === "string" && data.api_domain) {
    ZOHO_DOMAIN = data.api_domain;
  }

  ACCESS_TOKEN = data.access_token;
  const expiresIn = Number(data.expires_in) || 3600;
  ACCESS_EXPIRES_AT = Date.now() + expiresIn * 1000;

  console.log("[token] ok", ACCESS_TOKEN.slice(0, 12), "… api:", ZOHO_DOMAIN, "exp(s):", expiresIn);
  return ACCESS_TOKEN;
}
// -----------------------------------------------------------------


// --- ZOHO CREATOR HELPERS ---
const { 
  CREATOR_APP_OWNER, 
  CREATOR_APP_NAME, 
  CREATOR_FORM_NAME, 
  CREATOR_REPORT_NAME 
} = process.env;

async function fetchManualEntries() {
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  const creatorApiUrl = `https://creator.zoho.com/api/v2/${CREATOR_APP_OWNER}/${CREATOR_APP_NAME}/report/${CREATOR_REPORT_NAME}`;

  try {
    const res = await fetch(creatorApiUrl, {
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
      colour: '#8b5cf6', 
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
    const res = await fetch(creatorApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body,
    });
    const data = await res.json();
    
    if (data.code === 3000) { 
      console.log('[creator] Created new entry:', data.data.ID);
      return { success: true, id: data.data.ID };
    } else {
      console.error('[creator] Create error:', data);
      return { error: 'Failed to create entry in Creator', details: data };
    }
  } catch (e) {
    console.error('[creator] create fetch error:', e.message);
    return { error: e.message };
  }
}
// -----------------------------------------------------------------


// --- ZOHO PROJECTS HELPER (NEW) ---
async function updateProjectsTask(caseData) {
  // caseData will contain { case_id, install_start, install_end, ... }
  console.log(`[Projects Sync] Received update for Case ID: ${caseData.case_id}`);
  
  // 1. FIND THE PROJECT
  // We need logic to find the correct Project (or Task) associated with this Case.
  // For now, we'll just log the data.
  console.log('[Projects Sync] Data:', caseData);

  // 2. GET ACCESS TOKEN
  // const accessToken = await getAccessToken();
  // if (!accessToken) throw new Error("Could not get token for Projects");

  // 3. FIND/UPDATE TASK
  // const portalId = "YOUR_PORTAL_ID"; // We need this
  // const projectId = "YOUR_PROJECT_ID"; // We need to find this
  // const taskId = "YOUR_TASK_ID"; // We need to find this
  // const projectsApiUrl = `https://projects.zoho.com/restapi/portal/${portalId}/projects/${projectId}/tasks/${taskId}/`;
  
  // const body = JSON.stringify({
  //   "task": {
  //     "start_date": caseData.install_start,
  //     "end_date": caseData.install_end,
  //     "owner": caseData.wip_manager_id, 
  //     "custom_fields": {
  //       "Sync_Source": "crm" // This is the loop protection
  //     }
  //   }
  // });
  
  // const res = await fetch(projectsApiUrl, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Zoho-oauthtoken ${accessToken}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: body,
  // });
  // const data = await res.json();
  // console.log('[Projects Sync] Update result:', data);

  return { success: true };
}


// in-memory snapshot
let CASES_CACHE = { events: [], lastUpdated: 0 };

// util: ensure dir + safe write
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

// prune items older than PRUNE_DAYS from today using end|start|created_time
function pruneOld(events) {
  const cutoff = Date.now() - PRUNE_DAYS * 24 * 60 * 60 * 1000;
  return events.filter((e) => {
    const key = e.end || e.start || e.created_time;
    const t = key ? new Date(key).getTime() : 0;
    return t === 0 || t >= cutoff;
  });
}

// ----- State → colour map (match your Zoho picklist dots) -----
const STATE_COLOURS = {
  VIC: "#666666", // grey
  NSW: "#eb4d4d", // red
  QLD: "#f97316", // orange
  WA:  "#8197e2", // blue
  ACT: "#fcd9bd", // peach
  TAS: "#e972fd", // pink
  NT:  "#9a2e47", // maroon
  SA:  "#ffda62", // yellow
  NZ:  "#22c55e", // green
  Other: "#9ca3af",
};


// ----- Fetch from Zoho with the exact API names you gave -----
async function fetchCasesFromZoho() {
  const token = await getAccessToken(); 

  const fields = [
    "id",
    "Subject",
    "Install_Date",
    "Install_End_Date",
    "Install_Start_Time",
    "State",
    "Owner",
    "Case_Number",
    "Description",
    "WIP_Manager",
    "WIP_Manager1",
    "Installer",
    "Modified_Time",
    "Created_Time",
  ].join(",");

  const url = `${ZOHO_DOMAIN}/crm/v2/Cases?per_page=200&fields=${encodeURIComponent(fields)}`;

  const r = await fetch(url, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
  const text = await r.text();
  if (!r.ok) throw new Error(`Zoho fetch failed ${r.status}: ${text}`);

  const { data: rows = [] } = JSON.parse(text);

  const events = rows.map((row) => {
    const wipMgrName = asName(row.WIP_Manager1) || asName(row.WIP_Manager);
    const installerName = asName(row.Installer) || asName(row.WIP_Manager);
    const ownerFirst = firstWord(row.Owner); // Owner is a user object

    return {
      id: row.id,
      title: row.Subject || `Case ${row.Case_Number || ""}`,
      start: toYMD(row.Install_Date || row.Created_Time),
      end: toYMD(row.Install_End_Date || row.Install_Date || row.Modified_Time || row.Created_Time),
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

  return events;
}

// ----- mapper (no longer used by fetchCasesFromZoho but kept just in case) -----
function mapZohoCase(z) {
  return {
    id: String(z.id),
    title: z.Subject || "Untitled",
    start: z.Install_Date || "",
    end: z.Install_End_Date || z.Install_Date || "",
    startTime: toStringSafe(z.Install_Start_Time),
    state: toStringSafe(z.State),
    wipManager: asName(z.WIP_Manager1) || asName(z.WIP_Manager),
    installer:  asName(z.Installer)    || asName(z.WIP_Manager),
    caseOwner:  firstWord(z.Owner),
    pmNotes: toStringSafe(z.Description).slice(0, 200),
    caseUrl: `https://crm.zoho.com/crm/org640578001/tab/Cases/${z.id}`,
    created_time: toStringSafe(z.Created_Time),
    modified_time: toStringSafe(z.Modified_Time),
  };
}


// load cache on boot
async function loadCacheOnBoot() {
  const file = await readJSONSafe(CASES_PATH, { events: [], lastUpdated: 0 });
  CASES_CACHE = {
    events: Array.isArray(file.events) ? file.events : [],
    lastUpdated: Number(file.lastUpdated) || 0,
  };
}
await loadCacheOnBoot();

// persist cache
async function persistCache() {
  const payload = { events: CASES_CACHE.events, lastUpdated: Date.now() };
  await writeJSONAtomic(CASES_PATH, payload);
  CASES_CACHE.lastUpdated = payload.lastUpdated;
}

// --- UPDATED refreshCases ---
async function refreshCases(reason = "manual") {
  console.log(`[cases] refresh starting (${reason})`);
  try {
    const [crmCases, manualEntries] = await Promise.all([
      fetchCasesFromZoho(),
      fetchManualEntries()
    ]);

    console.log(`[cases] Fetched ${crmCases.length} CRM cases.`);
    console.log(`[cases] Fetched ${manualEntries.length} Creator entries.`);

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

// Exchange auth code -> refresh token
app.get("/oauth/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing ?code param");

  const url = `https://accounts.zoho.com/oauth/v2/token?${qs.stringify({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  })}`;

  const r = await fetch(url, { method: "POST" });
  const json = await r.json();

  if (!r.ok) {
    console.error("[oauth/callback] exchange failed", r.status, json);
    return res.status(400).json(json);
  }
  if (!json.refresh_token) {
    console.error("[oauth/callback] no refresh_token returned!", json);
    return res
      .status(200)
      .send("Auth OK but no refresh_token. Use access_type=offline & prompt=consent in the auth URL.");
  }

  REFRESH_TOKEN = json.refresh_token;
  console.log("[oauth/callback] refresh_token captured (trim):", REFRESH_TOKEN.slice(0, 12), "…");
  res.send("Refresh token captured. You can close this window.");
});

// Force a refresh and show a trimmed token + expiry
app.get("/debug/refresh", async (req, res) => {
  try {
    const tok = await getAccessToken(); 
    res.json({
      ok: true,
      access_token_trim: tok ? tok.slice(0, 12) + "…" : null,
      expires_at: new Date(ACCESS_EXPIRES_AT).toISOString(),
      has_refresh_token: Boolean(REFRESH_TOKEN),
      accounts_host: ACCOUNTS_HOST,
      api_domain: ZOHO_DOMAIN,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) }); 
  }
});

app.get("/debug/ping", async (req, res) => {
  try {
    const token = await getAccessToken(); 
    const r = await fetch(`${ZOHO_DOMAIN}/crm/v2/users`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const body = await r.text();
    res.status(r.status).send(body);
  } catch (e) {
    res.status(500).send(String(e));
  }
});

// Delete cache file + clear memory, then (optionally) refresh
app.post("/api/cases/purge", async (_req, res) => {
  try {
    CASES_CACHE.events = [];
    await persistCache();
    res.json({ ok: true, count: 0, lastUpdated: CASES_CACHE.lastUpdated });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// schedule: every 10 minutes (tweak as needed)
cron.schedule("*/10 * * * *", () => refreshCases("cron"));

// optional: warm immediately on boot (non-blocking)
refreshCases("boot").catch(() => {});

// ---- API: serve from cache (instant) ----
app.get("/api/cases", (_req, res) => {
  res.json(CASES_CACHE.events);
});

// ---- API: force refresh (manual) ----
app.post("/api/cases/refresh", async (_req, res) => {
  const out = await refreshCases("manual");
  res.status(out.ok ? 200 : 500).json(out);
});

// Purge local cache
app.post("/api/cases/purge", async (_req, res) => {
  try {
    CASES_CACHE.events = [];
    await persistCache();
    res.json({ ok: true, count: 0, lastUpdated: CASES_CACHE.lastUpdated });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Inspect raw keys & the three lookups for one record from the cache
app.get("/debug/case/:id/raw", (req, res) => {
  const ev = CASES_CACHE.events.find(e => e.id === req.params.id);
  if (!ev) return res.status(404).json({ error: "not found", id: req.params.id }); 

  // We don't have raw Zoho rows in cache, so fetch a fresh record straight from Zoho:
  (async () => {
    try {
      const token = await getAccessToken(); 
      const r = await fetch(`${ZOHO_DOMAIN}/crm/v2/Cases/${req.params.id}`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` }
      });
      const json = await r.json();
      const row = (json.data && json.data[0]) || {};
      res.json({
        keys: Object.keys(row),
        Owner: row.Owner,
        WIP_Manager1: row.WIP_Manager1,
        WIP_Manager: row.WIP_Manager,
        Installer: row.Installer,
      });
    } catch (e) {
      res.status(500).json({ error: String(e) });
    }
  })();
});

// Token probe
app.get("/debug/refresh", async (_req, res) => {
  try {
    const tok = await getAccessToken(); 
    res.json({
      ok: true,
      access_token_trim: tok ? tok.slice(0, 12) + "…" : null,
      expires_at: new Date(ACCESS_EXPIRES_AT).toISOString(),
      has_refresh_token: Boolean(REFRESH_TOKEN),
      accounts_host: ACCOUNTS_HOST,
      api_domain: ZOHO_DOMAIN,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Lightweight Zoho ping
app.get("/debug/ping", async (_req, res) => {
  try {
    const token = await getAccessToken(); 
    const r = await fetch(`${ZOHO_DOMAIN}/crm/v2/users`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const body = await r.text();
    res.status(r.status).send(body);
  } catch (e) {
    res.status(500).send(String(e));
  }
});

app.get("/healthz", (req, res) => res.json({ ok: true }));

// ---- API: optimistic update from UI ----
app.patch("/api/cases/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { start, end, title, state } = req.body || {};
    let found = false;
    
    CASES_CACHE.events = CASES_CACHE.events.map((e) => {
      if (e.id !== id) return e;
      found = true;
      return {
        ...e,
        start: start ? toYMD(start) : e.start,
        end: end ? toYMD(end) : e.end,
        title: title ?? e.title,
        state: state ?? e.state,
        modified_time: new Date().toISOString(),
      };
    });

    if (!found) return res.status(404).json({ ok: false, error: "Not found" });

    await persistCache();

    // --- UPDATED: Also save change back to Zoho ---
    if (id.startsWith('creator_')) {
      // TODO: Build updateManualEntry function
      console.warn(`[PATCH] Update for Creator ID ${id} not yet implemented.`);
    } else {
      // Update CRM case
      updateCaseInZoho(id, start, end); // Run in background
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// --- NEW ENDPOINT for CREATOR ---
app.post("/api/manual-entry", async (req, res) => {
  const eventData = req.body;
  
  const result = await createManualEntry(eventData);

  if (result.success) {
    refreshCases("post-create");
    res.status(201).json({ status: 'success', id: result.id });
  } else {
    res.status(500).json({ error: 'Failed to create manual entry', details: result.details });
  }
});

// --- NEW WEBHOOK ENDPOINT for CRM ---
app.post("/api/webhook/crm-case-updated", async (req, res) => {
  console.log('[Webhook CRM] Received a request...');

  // 1. Check security
  const secret = req.headers['x-webhook-secret'];
  if (!ZOHO_WEBHOOK_SECRET || secret !== ZOHO_WEBHOOK_SECRET) {
    console.warn('[Webhook CRM] Failed security check. Invalid secret.');
    return res.status(401).send('Unauthorized');
  }

  // 2. Get data (Zoho sends as form-data)
  // --- UPDATED: Add verbose logging ---
  console.log('[Webhook CRM] Raw Body:', req.body);
  const data = req.body;
  
  // 3. Check for loops
  if (data.sync_source === 'projects') {
    console.log(`[Webhook CRM] Loop protection: Ignoring update for Case ${data.case_id} (source=projects).`);
    return res.status(200).send('Loop prevented');
  }

  // 4. Process the update
  try {
    console.log(`[Webhook CRM] Processing update for Case ${data.case_id}...`);
    await updateProjectsTask(data);
    res.status(200).send('Webhook received');
  } catch (e) {
    console.error(`[Webhook CRM] Error processing update for Case ${data.case_id}:`, e.message);
    res.status(500).send('Error processing webhook');
  }
});


app.get("/debug/case/:id", (_req, res) => {
  const { id } = _req.params;
  const ev = CASES_CACHE.events.find(e => e.id === id);
  res.json(ev || { error: "not found", id });
});

app.get("/debug/case/:id/raw", async (req, res) => {
  try {
    const token = await getAccessToken(); 
    const r = await fetch(`${ZOHO_DOMAIN}/crm/v2/Cases/${req.params.id}`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    });
    const json = await r.json();
    const row = (json.data && json.data[0]) || {};
    res.json({
      has: Object.keys(row),
      Owner: row.Owner,
      WIP_Manager1: row.WIP_Manager1,
      WIP_Manager: row.WIP_Manager,
      Installer: row.Installer,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) }); 
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});