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
    const last = typeof v.last_name === "string" ? v.last_name.trim() : "";
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

// Creates a blank event object for the editor
function createNewEvent() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: `new_${Date.now()}`, // Temporary ID for a new event
    title: "",
    start: today,
    end: today,
    startTime: "09:00",
    wipManager: "",
    installer: "",
    caseOwner: "",
    pmNotes: "",
    isNew: true, // Flag to identify new manual entries
    isManual: true,
  };
}

function normalizeEvent(raw, idx = 0) {
  const id = String(firstNonEmpty(raw, ["id", "Id", "ID", "_id"], `evt-${idx}`));
  const title = String(firstNonEmpty(raw, ["title", "Subject", "name", "Title"], "Untitled"));

  // Dates from Zoho (fallback end → start)
  const start = toYMD(firstNonEmpty(raw, [
    "start", "Install_Date", "startDate", "StartDate", "dateStart", "start_date"
  ]));
  const end = toYMD(firstNonEmpty(raw, [
    "end", "Install_End_Date", "endDate", "EndDate", "dateEnd", "end_date"
  ]) || start);

  // Names / labels — use firstNonEmpty so empty strings don’t mask real values
  const wipManager = asName(firstNonEmpty(raw, ["wipManager", "WIP_Manager1", "WIP", "wip"]));
  const installer = asName(firstNonEmpty(raw, ["installer", "Installer", "WIP_Manager", "tech", "Technician"]));
  const caseOwner = firstWord(firstNonEmpty(raw, ["caseOwner", "Owner", "owner"]));

  const pmNotesRaw = first(raw, ["pmNotes", "Description", "notes", "Notes"]) || "";
  const pmNotes = (typeof pmNotesRaw === "string" ? pmNotesRaw : String(pmNotesRaw)).slice(0, 200);
  const startTime = firstNonEmpty(raw, ["startTime", "Install_Start_Time", "time", "StartTime"]) || "";

  const caseId = firstNonEmpty(raw, ["caseId", "Case_Number", "crmId", "CaseId", "id"]);
  const caseUrl = firstNonEmpty(raw, ["caseUrl", "url", "Url"]) || "";

  const state = firstNonEmpty(raw, ["state", "State", "jobState", "region", "Region"]) || "";
  const caseManager = firstNonEmpty(raw, ["caseManager", "CaseManager", "manager", "Manager"]) || "";

  // Keep colour if server already set one; otherwise we assign below
  const colour = firstNonEmpty(raw, ["colour", "color", "colourHex", "Color"]);
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
  NZ: "#22c55e", Other: "#9ca3af",
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
  const api = import.meta.env.VITE_API_URL || "";

  const loadData = React.useCallback(async (reason = "init") => {
    if (reason === "init") setLoading(true);
    setError(null);
    
    try {
      if (reason === "init") {
        // --- Authentication Check ---
        if (window.self === window.top) {
          console.error("[Calendar] Public access blocked.");
          throw new Error("This application can only be accessed from within Zoho CRM.");
        }
        console.log("[Calendar] Auth check passed (loaded in iframe).");
      }
      
      // --- Data Loading ---
      console.log(`[Calendar] Fetching data from ${api}/api/cases`);
      const res = await fetch(`${api}/api/cases`, { cache: "no-store" });
      if (!res.ok) throw new Error(`API ${res.status}`);
      
      const data = await res.json();
      const list = Array.isArray(data) ? data : Array.isArray(data?.events) ? data.events : [];
      
      setEvents(list.map(normalizeEvent));
      console.log("[Calendar] Data loaded successfully.");

    } catch (e) {
      console.error("[Calendar] Load failed:", e);
      setError(String(e));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [api]); // Dependency on `api`

  React.useEffect(() => {
    loadData("init"); // Initial load
  }, [loadData]); // Run once on mount

  // Admin actions: refresh/purge + reload
  async function callAdmin(path, label = "Action") {
    if (busy) return;
    setBusy(true);
    try {
      const post = await fetch(`${api}${path}`, { method: "POST", cache: "no-store" });
      if (!post.ok) throw new Error(`${label} ${post.status}`);
      
      // Manually trigger a reload of data from the frontend
      await loadData("manual_refresh");
      
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
    // Prioritize manual event color, then state color
    return filtered.map(e => ({ ...e, colour: e.colour || STATE_COLOURS[e.state] || STATE_COLOURS.Other }));
  }, [filtered, colourMode]);

  // editor state + toast/undo
  const [editor, setEditor] = React.useState({ open: false, ev: null, clickEvent: null });
  const historyRef = React.useRef(new Map());

  // Opens the editor with a new, blank event
  const handleAddNew = React.useCallback(() => {
    setEditor({
      open: true,
      ev: createNewEvent(),
      clickEvent: null, // Open in center (default position)
    });
  }, []);

  // --- UPDATED saveCase logic ---
  async function saveEvent(eventData) {
    const { id, start, end, isNew, isManual } = eventData;
    const api = import.meta.env.VITE_API_URL || "";
    
    try {
      if (isNew) {
        // --- CREATE new manual entry ---
        const res = await fetch(`${api}/api/manual-entry`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData), // Send the whole event
        });
        if (!res.ok) throw new Error(await res.text());
        
      } else if (isManual) {
        // --- UPDATE existing manual entry ---
        // TODO: Build PATCH /api/manual-entry/:id endpoint
        console.warn("Update logic for Creator entries is not built yet.");
        // For now, we'll just update the CRM one as a fallback.
        await fetch(`${api}/api/cases/${id.replace('creator_', '')}`, { // Fallback to PATCH crm
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ start, end }),
        });

      } else {
        // --- UPDATE existing CRM entry ---
        await fetch(`${api}/api/cases/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ start, end }),
        });
      }
    } catch (e) {
      console.warn("[Calendar] saveEvent failed:", e);
      // Re-throw to notify applyDates
      throw e;
    }
  }

  // Handles saving dates from the editor
  const applyDates = React.useCallback(async (id, updatedEventData) => {
    const { start, end, isNew } = updatedEventData;

    // --- Logic for NEW event ---
    if (isNew) {
      try {
        await saveEvent(updatedEventData);
        // Add to local state
        setEvents(prev => [...prev, normalizeEvent(updatedEventData)]);
        push({ message: `Event "${updatedEventData.title}" created.`, timeoutMs: 3000 });
      } catch (e) {
        push({ message: `Failed to create event: ${e.message}`, timeoutMs: 4000 });
      }
      return; // Stop here
    }

    // --- Logic for EXISTING event ---
    const prev = events.find((e) => e.id === id);
    if (!prev) return;

    // Store old dates for undo
    historyRef.current.set(id, { start: prev.start, end: prev.end });

    // Update local state optimistically
    const next = events.map((e) => (e.id === id ? { ...e, ...updatedEventData } : e));
    setEvents(next);

    // Persist in the background
    try {
      await saveEvent(updatedEventData);
      
      let undone = false;
      const undo = () => {
        if (undone) return;
        undone = true;
        const prior = historyRef.current.get(id);
        if (!prior) return;
        const revert = events.map((e) => (e.id === id ? { ...e, ...prior } : e));
        setEvents(revert);
        saveEvent({ ...prev, ...prior }); // Re-save the undone dates
      };
  
      push({
        message: `Dates changed to ${start} → ${end}`,
        actionLabel: "Undo",
        onAction: undo,
        timeoutMs: 5000,
      });

    } catch (e) {
      // Save failed, roll back the optimistic update
      setEvents(prevEvents => prevEvents.map(e => (e.id === id ? prev : e)));
      push({ message: `Failed to save changes: ${e.message}`, timeoutMs: 4000 });
    }
  }, [events, push, api]); // Added `api` to dependency array

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
        onOpenEditor={(ev, clickEvent) => setEditor({ open: true, ev, clickEvent })}
      />
    ) : (
      <MonthView
        date={date}
        events={colouredEvents}
        onOpenEditor={(ev, clickEvent) => setEditor({ open: true, ev, clickEvent })}
      />
    );

  return (
    <div className="h-full flex flex-col">
      <Toolbar
        view={view}
        onViewChange={onViewChange}
        date={date}
        onNav={onNav}
        onAddNew={handleAddNew} // Connect "Add New" button handler
        onRefresh={() => callAdmin("/api/cases/refresh", "Refresh")} // (no longer visible)
        onPurge={() => callAdmin("/api/cases/purge", "Purge")}     // (no-GIST:)
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
        clickEvent={editor.clickEvent}
        ev={editor.ev || undefined}
        onClose={() => setEditor({ open: false, ev: null, clickEvent: null })}
        // Pass the full event object back
        onChangeDates={(id, updatedEvent) => applyDates(id, updatedEvent)}
      />
    </div>
  );
}