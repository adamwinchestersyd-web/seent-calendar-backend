// src/components/Calendar.jsx
import * as React from "react";

// Views
import WeekView from "../views/WeekView";
import MonthView from "../views/MonthView";
import DayView from "../views/DayView";

// Header + Filters
import Toolbar from "../app/ui/Toolbar";
import FiltersBar from "../filters/FiltersBar";

// Editor + toast
import EventEditor from "../app/utils/EventEditor";
import { useToast } from "../app/utils/useToast";

/* ---------------- helpers ---------------- */
function first(obj, keys, fallback = undefined) {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k];
  }
  return fallback;
}

// like first(), but ignores '' and '   '
function firstNonEmpty(obj, keys, fallback = undefined) {
  for (const k of keys) {
    if (!obj) continue;
    const v = obj[k];
    if (v == null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    return v;
  }
  return fallback;
}

// Normalize Zoho lookup (object or string) to a plain string name.
function asName(v) {
  if (!v) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object") {
    if (typeof v.name === "string") return v.name.trim();
    if (typeof v.display_value === "string") return v.display_value.trim();
    const first = typeof v.first_name === "string" ? v.first_name.trim() : "";
    const last  = typeof v.last_name  === "string" ? v.last_name.trim()  : "";
    return `${first} ${last}`.trim();
  }
  return "";
}

function firstWord(v) {
  const s = asName(v);
  return s ? s.split(/\s+/)[0] : "";
}

function toYMD(input) {
  if (!input) return "";
  if (typeof input === "string") {
    const s = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const iso = Date.parse(s);
    if (!Number.isNaN(iso)) return new Date(iso).toISOString().slice(0, 10);
  }
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function normalizeEvent(raw, idx = 0) {
  const id     = String(firstNonEmpty(raw, ["id", "Id", "ID", "_id"], `evt-${idx}`));
  const title  = String(firstNonEmpty(raw, ["title", "Subject", "name", "Title"], "Untitled"));

  // Dates from Zoho (fallback end → start)
  const start  = toYMD(firstNonEmpty(raw, [
    "start", "Install_Date", "startDate", "StartDate", "dateStart", "start_date"
  ]));
  const end    = toYMD(firstNonEmpty(raw, [
    "end", "Install_End_Date", "endDate", "EndDate", "dateEnd", "end_date"
  ]) || start);

  // Names / labels — use firstNonEmpty so empty strings don’t mask real values
  const wipManager  = asName(firstNonEmpty(raw, ["wipManager", "WIP_Manager1", "WIP", "wip"]));
  // Your “Installer” value is coming from Zoho field WIP_Manager (lookup)
  const installer   = asName(firstNonEmpty(raw, ["installer", "Installer", "WIP_Manager", "tech", "Technician"]));
  const caseOwner   = firstWord(firstNonEmpty(raw, ["caseOwner", "Owner", "owner"]));

  const pmNotesRaw  = first(raw, ["pmNotes", "Description", "notes", "Notes"]) || "";
  const pmNotes     = (typeof pmNotesRaw === "string" ? pmNotesRaw : String(pmNotesRaw)).slice(0, 200);
  const startTime   = firstNonEmpty(raw, ["startTime", "Install_Start_Time", "time", "StartTime"]) || "";

  const caseId      = firstNonEmpty(raw, ["caseId", "Case_Number", "crmId", "CaseId", "id"]);
  const caseUrl     = firstNonEmpty(raw, ["caseUrl", "url", "Url"]) || "";

  const state       = firstNonEmpty(raw, ["state", "State", "jobState", "region", "Region"]) || "";
  const caseManager = firstNonEmpty(raw, ["caseManager", "CaseManager", "manager", "Manager"]) || "";

  // Keep colour if server already set one; otherwise we assign below
  const colour     = firstNonEmpty(raw, ["colour", "color", "colourHex", "Color"]);
  const colorClass = firstNonEmpty(raw, ["colorClass", "className"], "event--blue");

  return {
    ...raw,
    id, title, start, end, startTime,
    wipManager, installer, caseOwner, pmNotes,
    caseId, caseUrl,
    state, caseManager,
    colour, colorClass,
  };
}

// Zoho state colours (stable)
const STATE_COLOURS = {
  VIC: "#6b7280", NSW: "#ef4444", QLD: "#f97316", WA: "#60a5fa",
  ACT: "#fcd9bd", TAS: "#ec4899", NT: "#b91c1c", SA: "#facc15",
  NZ:  "#22c55e", Other: "#9ca3af",
};
// Fallback palette for "Colour by Case"
const PALETTE = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#e11d48","#84cc16","#14b8a6","#f97316"];
function colourForKeyStable(key) {
  if (!key) return PALETTE[0];
  let h = 0; const s = String(key);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
/* ---------------------------------------------------------------- */

export default function Calendar() {
  const { push } = useToast();

  // Page state
  const [date, setDate] = React.useState(new Date());
  const [view, setView] = React.useState("week"); // "day" | "week" | "month"
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  // Filter state
  const [filterWip, setFilterWip] = React.useState("");
  const [filterInstaller, setFilterInstaller] = React.useState("");
  const [filterState, setFilterState] = React.useState("");
  const [colourMode, setColourMode] = React.useState("state"); // "state" | "case"

// Load + normalize data from API
  React.useEffect(() => {
    let cancelled = false;

    async function initializeAndLoad() {
      try {
        setLoading(true); // Start loading (for auth + data)
        setError(null);

        // 1. --- Authentication Check ---
        console.log("[Calendar] Starting auth check...");
        let attempts = 0;
        
        // @ts-ignore
        while (typeof window.ZOHO === "undefined" || typeof window.ZOHO.embeddedApp === "undefined") {
          if (attempts > 50) { // Wait for a max of 5 seconds (50 * 100ms)
            console.error("[Calendar] Timeout: window.ZOHO.embeddedApp not found after 5s.");
            throw new Error("This application can only be accessed from within Zoho CRM. (SDK Timeout)");
          }
          await new Promise(resolve => setTimeout(resolve, 100)); // wait 100ms
          attempts++;
        }
        
        console.log("[Calendar] SDK found! Initializing...");
        
        // @ts-ignore
        await window.ZOHO.embeddedApp.init(); // This is the initialization call

        console.log("[Calendar] SDK initialized successfully.");

        // *** THIS IS YOUR NEW CODE, PLACED AFTER INIT() ***
        // @ts-ignore
        window.ZOHO.embeddedApp.on("PageLoad", function() {
          console.log("[Calendar] Zoho PageLoad Event Fired");
        });
        // *************************************************

        // 2. --- Data Loading (if auth passed) ---
        const api = import.meta.env.VITE_API_URL || "";
        console.log(`[Calendar] Fetching data from ${api}/api/cases`);
        const res = await fetch(`${api}/api/cases`, { cache: "no-store" });
        if (!res.ok) throw new Error(`API ${res.status}`);
        
        const data = await res.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.events) ? data.events : [];
        
        if (!cancelled) setEvents(list.map(normalizeEvent));
        console.log("[Calendar] Data loaded successfully.");

      } catch (e) {
        // This will catch the timeout, the init() failure, or data fetch errors.
        if (!cancelled) {
          console.error("[Calendar] Init or Load failed:", e);
          setError(String(e)); // This will set the error state
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false); // Stop loading
      }
    }

    initializeAndLoad(); // Run the async function

    return () => { cancelled = true; };
  }, []); // Empty array, runs once on mount

  // Admin actions: refresh/purge + reload
  async function callAdmin(path, label = "Action") {
    if (busy) return;
    setBusy(true);
    try {
      const api = import.meta.env.VITE_API_BASE || "";
      const post = await fetch(`${api}${path}`, { method: "POST", cache: "no-store" });
      if (!post.ok) throw new Error(`${label} ${post.status}`);
      const r = await fetch(`${api}/api/cases?t=${Date.now()}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`API ${r.status}`);
      const data = await r.json();
      const list = Array.isArray(data) ? data : Array.isArray(data?.events) ? data.events : [];
      setEvents(list.map(normalizeEvent));
      push({ message: `${label} complete`, timeoutMs: 2500 });
    } catch (e) {
      console.error("[Calendar] admin action failed:", e);
      push({ message: `${label} failed`, timeoutMs: 3500 });
    } finally {
      setBusy(false);
    }
  }

  // Toolbar handlers
  const onViewChange = React.useCallback((v) => setView(v), []);
  const onNav = React.useCallback((dir) => {
    if (dir === 0) return setDate(new Date());
    const d = new Date(date);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    setDate(d);
  }, [date, view]);

  // options for dropdowns (derived from current dataset)
  const { wipOptions, installerOptions, stateOptions } = React.useMemo(() => {
    const wipSet = new Set(), instSet = new Set(), stateSet = new Set();
    events.forEach((e) => {
      if (e.wipManager) wipSet.add(e.wipManager);
      if (e.installer) instSet.add(e.installer);
      if (e.state) stateSet.add(e.state);
    });
    return {
      wipOptions: Array.from(wipSet).sort(),
      installerOptions: Array.from(instSet).sort(),
      stateOptions: Array.from(stateSet).sort(),
    };
  }, [events]);

  // apply filters
  const filtered = React.useMemo(() => {
    const w = filterWip.trim().toLowerCase();
    const ins = filterInstaller.trim().toLowerCase();
    const st = filterState.trim().toLowerCase();
    return events.filter((e) => {
      const okW = !w || (e.wipManager || "").toLowerCase() === w;
      const okI = !ins || (e.installer || "").toLowerCase() === ins;
      const okS = !st || (e.state || "").toLowerCase() === st;
      return okW && okI && okS;
    });
  }, [events, filterWip, filterInstaller, filterState]);

  // apply colouring (State by default; stable-by-case on demand)
  const colouredEvents = React.useMemo(() => {
    if (!filtered?.length) return filtered;
    if (colourMode === "case") {
      return filtered.map(e => ({ ...e, colour: e.colour || colourForKeyStable(e.caseManager || e.id) }));
    }
    return filtered.map(e => ({ ...e, colour: e.colour || STATE_COLOURS[e.state] || STATE_COLOURS.Other }));
  }, [filtered, colourMode]);

  // editor state + toast/undo
  const [editor, setEditor] = React.useState({ open: false, ev: null, anchor: null });
  const historyRef = React.useRef(new Map());

  async function saveCaseDates(id, start, end) {
    try {
      const api = import.meta.env.VITE_API_BASE || "";
      await fetch(`${api}/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end }),
      });
    } catch (e) {
      console.warn("[Calendar] saveCaseDates failed:", e);
    }
  }

  const applyDates = React.useCallback((id, start, end) => {
    const prev = events.find((e) => e.id === id);
    if (!prev) return;

    historyRef.current.set(id, { start: prev.start, end: prev.end });

    const next = events.map((e) => (e.id === id ? { ...e, start, end } : e));
    setEvents(next);

    // persist in the background
    saveCaseDates(id, start, end);

    let undone = false;
    const undo = () => {
      if (undone) return;
      undone = true;
      const prior = historyRef.current.get(id);
      if (!prior) return;
      const revert = events.map((e) => (e.id === id ? { ...e, ...prior } : e));
      setEvents(revert);
      saveCaseDates(id, prior.start, prior.end);
    };

    push({
      message: `Dates changed to ${start} → ${end}`,
      actionLabel: "Undo",
      onAction: undo,
      timeoutMs: 5000,
    });
  }, [events, push]);

  // Reset filters
  const handleReset = React.useCallback(() => {
    setFilterWip("");
    setFilterInstaller("");
    setFilterState("");
  }, []);

  // Loading / Error UI
  if (loading) return <div className="p-4">Loading cases…</div>;
  if (error)   return <div className="p-4 text-red-500">Error loading cases: {error}</div>;

  const viewNode =
    view === "day" ? (
      <DayView date={date} events={colouredEvents} />
    ) : view === "week" ? (
      <WeekView
        date={date}
        events={colouredEvents}
        onOpenEditor={(ev, rect) => setEditor({ open: true, ev, anchor: rect })}
      />
    ) : (
      <MonthView
        date={date}
        events={colouredEvents}
        onOpenEditor={(ev, rect) => setEditor({ open: true, ev, anchor: rect })}
      />
    );

  return (
    <div className="h-full flex flex-col">
      <Toolbar
        view={view}
        onViewChange={onViewChange}
        date={date}
        onNav={onNav}
        onRefresh={() => callAdmin("/api/cases/refresh", "Refresh")}
        onPurge={() => callAdmin("/api/cases/purge", "Purge")}
      />

      <FiltersBar
        wipOptions={wipOptions}
        installerOptions={installerOptions}
        stateOptions={stateOptions}
        valueWip={filterWip}
        valueInstaller={filterInstaller}
        valueState={filterState}
        onWipChange={setFilterWip}
        onInstallerChange={setFilterInstaller}
        onStateChange={setFilterState}
        colourMode={colourMode}
        onColourModeChange={setColourMode}
        onReset={handleReset}
      />

      <div className="flex-1">{viewNode}</div>

      <EventEditor
        open={editor.open}
        anchor={editor.anchor}
        ev={editor.ev || undefined}
        onClose={() => setEditor({ open: false, ev: null, anchor: null })}
        onChangeDates={(id, start, end) => applyDates(id, start, end)}
      />
    </div>
  );
}
