// CACHE BUST v8
import * as React from "react";

// Views
import WeekView from "../views/WeekView";
import MonthView from "../views/MonthView";
import DayView from "../views/DayView";

// Header + Filters
import Toolbar from "../app/ui/Toolbar";
import FiltersBar from "../filters/FiltersBar";

// --- UPDATED: Import both editors ---
import EventEditor from "../app/utils/EventEditor"; // The read-only one
import ManualEntryEditor from "../app/utils/ManualEntryEditor"; // The editable one

import { useToast } from "../app/utils/useToast";

/* ---------------- helpers ---------------- */
function first(obj, keys, fallback = undefined) {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k];
  }
  return fallback;
}

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
    id: `new_${Date.now()}`,
    title: "",
    start: today,
    end: today,
    startTime: "09:00",
    wipManager: "",
    installer: "",
    caseOwner: "",
    state: "", 
    pmNotes: "",
    isNew: true,
    isManual: true,
  };
}

function normalizeEvent(raw, idx = 0) {
  const id = String(firstNonEmpty(raw, ["id", "Id", "ID", "_id"], `evt-${idx}`));
  const title = String(firstNonEmpty(raw, ["title", "Subject", "name", "Title"], "Untitled"));

  const start = toYMD(firstNonEmpty(raw, [
    "start", "Install_Date", "startDate", "StartDate", "dateStart", "start_date"
  ]));
  const end = toYMD(firstNonEmpty(raw, [
    "end", "Install_End_Date", "endDate", "EndDate", "dateEnd", "end_date"
  ]) || start);

  // --- CHANGED: Use firstWord for wipManager ---
  const wipManager = firstWord(firstNonEmpty(raw, ["wipManager", "WIP_Manager1", "WIP", "wip"]));
  const installer = asName(firstNonEmpty(raw, ["installer", "Installer", "WIP_Manager", "tech", "Technician"]));
  const caseOwner = firstWord(firstNonEmpty(raw, ["caseOwner", "Owner", "owner"]));

  const pmNotesRaw = first(raw, ["pmNotes", "Description", "notes", "Notes"]) || "";
  const pmNotes = (typeof pmNotesRaw === "string" ? pmNotesRaw : String(pmNotesRaw)).slice(0, 200);
  const startTime = firstNonEmpty(raw, ["startTime", "Install_Start_Time", "time", "StartTime"]) || "";

  const caseId = firstNonEmpty(raw, ["caseId", "Case_Number", "crmId", "CaseId", "id"]);
  const caseUrl = firstNonEmpty(raw, ["caseUrl", "url", "Url"]) || "";

  const state = firstNonEmpty(raw, ["state", "State", "jobState", "region", "Region"]) || "";
  const caseManager = firstNonEmpty(raw, ["caseManager", "CaseManager", "manager", "Manager"]) || "";

  const colour = firstNonEmpty(raw, ["colour", "color", "colourHex", "Color"]);
  const colorClass = firstNonEmpty(raw, ["colorClass", "className"], "event--blue");

  return {
    ...raw,
    id, title, start, end, startTime,
    wipManager, installer, caseOwner, pmNotes,
    caseId, caseUrl,
    state, caseManager,
    colour, colorClass,
    // isManual is set by the backend
  };
}

// Zoho state colours (stable)
const STATE_COLOURS = {
  VIC: "#27272a", NSW: "#ef4444", QLD: "#f97316", WA: "#60a5fa",
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

// --- NEW: Style for the version number (MOVED OUTSIDE) ---
const versionStyle = {
  position: "absolute",
  bottom: "8px",
  left: "12px",
  fontSize: "10px",
  color: "#9ca3af",
  zIndex: 10,
};
/* ---------------------------------------------------------------- */

export default function Calendar() {
  const { push } = useToast();

  // Page state
  const [date, setDate] = React.useState(new Date());
  const [view, setView] = React.useState("week");
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  // Filter state
  const [filterWip, setFilterWip] = React.useState("");
  const [filterInstaller, setFilterInstaller] = React.useState("");
  const [filterState, setFilterState] = React.useState("");
  const [colourMode, setColourMode] = React.useState("state");

  // --- NEW: State for modal dropdowns ---
  const [allCrmUsers, setAllCrmUsers] = React.useState([]);
  const [allServiceAgents, setAllServiceAgents] = React.useState([]);

  // Load + normalize data from API
  const api = import.meta.env.VITE_API_URL || "";

  // --- UPDATED: Added push notifications ---
  const loadData = React.useCallback(async (reason = "init") => {
    if (reason === "init") setLoading(true);
    if (reason === "manual_refresh") setBusy(true); // Show visual feedback for refresh
    setError(null);
    
    try {
      if (reason === "init") {
        if (window.self === window.top) {
          console.error("[Calendar] Public access blocked.");
          throw new Error("This application can only be accessed from within Zoho CRM.");
        }
        console.log("[Calendar] Auth check passed (loaded in iframe).");
      }
      
      console.log(`[Calendar] Fetching data from ${api}/api/cases`);
      const res = await fetch(`${api}/api/cases`, { cache: "no-store" });
      if (!res.ok) throw new Error(`API ${res.status}`);
      
      const data = await res.json();
      const list = Array.isArray(data) ? data : Array.isArray(data?.events) ? data.events : [];
      
      setEvents(list.map(normalizeEvent));
      console.log("[Calendar] Data loaded successfully.");

      // --- ADDED: Success notification ---
      if (reason === "manual_refresh") {
        push({ message: `Refresh complete. Loaded ${list.length} events.`, timeoutMs: 2500 });
      }

    } catch (e) {
      console.error("[Calendar] Load failed:", e);
      setError(String(e));
      setEvents([]);
      
      // --- ADDED: Error notification ---
      if (reason === "manual_refresh") {
        push({ message: `Refresh failed: ${e.message}`, timeoutMs: 4000 });
      }
    } finally {
      if (reason === "init") setLoading(false);
      if (reason === "manual_refresh") setBusy(false);
    }
  }, [api, push]); // Added `push`

  // --- NEW: Fetch modal lists on load ---
  React.useEffect(() => {
    async function fetchLists() {
      try {
        console.log("[Calendar] Fetching modal dropdown lists...");
        const [usersRes, agentsRes] = await Promise.all([
          fetch(`${api}/api/lists/users`),
          fetch(`${api}/api/lists/service-agents`)
        ]);
        if (!usersRes.ok) throw new Error("Failed to fetch CRM users");
        if (!agentsRes.ok) throw new Error("Failed to fetch Service Agents");
        
        const users = await usersRes.json();
        const agents = await agentsRes.json();
        
        setAllCrmUsers(users);
        setAllServiceAgents(agents);
        console.log("[Calendar] Modal lists loaded.");
      } catch (e) {
        console.error("[Calendar] Failed to load modal lists:", e);
        push({ message: `Failed to load dropdown lists: ${e.message}`, timeoutMs: 4000 });
      }
    }
    
    loadData("init");
    fetchLists();
  }, [loadData, api, push]); // Removed 'loadData' from here, it's in useCallback
  
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

  // --- options for MAIN FILTER bar (unchanged) ---
  const { wipOptions, installerOptions, stateOptions } = React.useMemo(() => {
    const wipSet = new Set(), instSet = new Set(), stateSet = new Set();
    events.forEach((e) => {
      // Use the raw full name for the dropdown, not the normalized first name
      const rawWip = asName(firstNonEmpty(e, ["wipManager", "WIP_Manager1", "WIP", "wip"]));
      if(rawWip) wipSet.add(rawWip);

      const rawInstaller = asName(firstNonEmpty(e, ["installer", "Installer", "WIP_Manager", "tech", "Technician"]));
      if(rawInstaller) instSet.add(rawInstaller);

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
    
    // NOTE: We filter on the *normalized* (first name) wipManager
    return events.filter((e) => {
      // We filter by full name now, as the filter dropdown contains full names
      const rawWip = asName(firstNonEmpty(e, ["wipManager", "WIP_Manager1", "WIP", "wip"]));
      const okW = !w || (rawWip || "").toLowerCase() === w.toLowerCase();
      const okI = !ins || (e.installer || "").toLowerCase() === ins;
      const okS = !st || (e.state || "").toLowerCase() === st;
      return okW && okI && okS;
    });
  }, [events, filterWip, filterInstaller, filterState]);

  // apply colouring
  const colouredEvents = React.useMemo(() => {
    if (!filtered?.length) return filtered;
    if (colourMode === "case") {
      return filtered.map(e => ({ ...e, colour: e.colour || colourForKeyStable(e.caseManager || e.id) }));
    }
    // Prioritize manual event color, then state color
    return filtered.map(e => ({ ...e, colour: e.isManual ? (STATE_COLOURS[e.state] || e.colour) : (STATE_COLOURS[e.state] || STATE_COLOURS.Other) }));
  }, [filtered, colourMode]);

  // Editor state
  const [editor, setEditor] = React.useState({
    open: false,
    mode: 'view', // 'view' | 'edit' | 'new'
    ev: null,
    clickEvent: null
  });
  const historyRef = React.useRef(new Map());

  // Handler for "Add New" button
  const handleAddNew = React.useCallback(() => {
    setEditor({
      open: true,
      mode: 'new', // Set mode to 'new'
      ev: createNewEvent(),
      clickEvent: null, // Open in center
    });
  }, []);
  
  // Handler for clicking on an event
  const handleOpenEditor = React.useCallback((ev, clickEvent) => {
    setEditor({
      open: true,
      mode: ev.isManual ? 'edit' : 'view',
      ev: ev,
      clickEvent: clickEvent,
    });
  }, []);
  
  // Handler to close the editor
  const handleCloseEditor = React.useCallback(() => {
    setEditor({ open: false, mode: 'view', ev: null, clickEvent: null });
  }, []);

  // API save logic
  async function saveEvent(eventData) {
    const { id, start, end, isNew, isManual } = eventData;
    const api = import.meta.env.VITE_API_URL || "";
    
    try {
      if (isNew) {
        // --- CREATE new manual entry ---
        const res = await fetch(`${api}/api/manual-entry`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        });
        if (!res.ok) throw new Error(await res.text());
        
      } else if (isManual) {
        // --- UPDATE existing manual entry ---
        // TODO: Build PATCH /api/manual-entry/:id endpoint
        console.warn("Update logic for Creator entries is not built yet.");
        
      } else {
        // --- UPDATE existing CRM entry ---
        await fetch(`${api}/api/cases/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ start, end }), // Only send dates
        });
      }
    } catch (e) {
      console.warn("[Calendar] saveEvent failed:", e);
      throw e;
    }
  }

  // --- NEW: API delete logic ---
  async function deleteEvent(id) {
    const api = import.meta.env.VITE_API_URL || "";
    try {
      if (!id.startsWith('creator_')) {
        throw new Error("Only manual entries can be deleted.");
      }
      const res = await fetch(`${api}/api/manual-entry/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      console.warn("[Calendar] deleteEvent failed:", e);
      throw e;
    }
  }

  // Handles saving data from either editor
  const applyDates = React.useCallback(async (id, updatedEventData) => {
    const { isNew } = updatedEventData;

    // --- Logic for NEW event ---
    if (isNew) {
      try {
        // --- CHANGED: Normalize before saving ---
        const normalizedNewEvent = normalizeEvent(updatedEventData);
        await saveEvent(normalizedNewEvent);
        await loadData("manual-save"); // Reload all data
        push({ message: `Event "${normalizedNewEvent.title}" created.`, timeoutMs: 3000 });
      } catch (e) {
        push({ message: `Failed to create event: ${e.message}`, timeoutMs: 4000 });
      }
      return;
    }

    // --- Logic for EXISTING event ---
    const prev = events.find((e) => e.id === id);
    if (!prev) return;

    historyRef.current.set(id, { start: prev.start, end: prev.end });
    
    // --- CHANGED: Normalize event before optimistic update ---
    const normalizedUpdatedEvent = normalizeEvent({ ...prev, ...updatedEventData });
    const next = events.map((e) => (e.id === id ? normalizedUpdatedEvent : e));
    setEvents(next); // Optimistic update

    try {
      await saveEvent(normalizedUpdatedEvent); // Save the normalized event
      
      let undone = false;
      const undo = () => {
        if (undone) return;
        undone = true;
        const prior = historyRef.current.get(id);
        if (!prior) return;
        // Revert to original `prev` event's dates
        const revert = events.map((e) => (e.id === id ? { ...prev, ...prior } : e));
        setEvents(revert);
        saveEvent({ ...prev, ...prior });
      };
  
      push({
        message: `Dates changed for "${normalizedUpdatedEvent.title}"`,
        actionLabel: "Undo",
        onAction: undo,
        timeoutMs: 5000,
      });

    } catch (e) {
      setEvents(prevEvents => prevEvents.map(e => (e.id === id ? prev : e)));
      push({ message: `Failed to save changes: ${e.message}`, timeoutMs: 4000 });
    }
  }, [events, push, api, loadData]); // `normalizeEvent` is a pure function, no dep needed

  // --- NEW: Handler for deleting an event ---
  const handleDelete = React.useCallback(async (id) => {
    const eventToDelete = events.find(e => e.id === id);
    if (!eventToDelete) return;

    const originalEvents = [...events]; // Keep a copy for rollback
    
    // Optimistic update: remove from state
    setEvents(prev => prev.filter(e => e.id !== id));
    handleCloseEditor(); // Close the modal
    
    try {
      await deleteEvent(id);
      push({ message: `Event "${eventToDelete.title}" deleted.`, timeoutMs: 3000 });
    } catch (e) {
      // Rollback on error
      setEvents(originalEvents);
      push({ message: `Failed to delete event: ${e.message}`, timeoutMs: 4000 });
    }
  }, [events, push, api, handleCloseEditor]); // Added deps


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
        onOpenEditor={handleOpenEditor}
      />
    ) : (
      <MonthView
        date={date}
        events={colouredEvents}
        onOpenEditor={handleOpenEditor}
      />
    );

  return (
    <div className="h-full flex flex-col" style={{ position: "relative" }}>
      <Toolbar
        view={view}
        onViewChange={onViewChange}
        date={date}
        onNav={onNav}
        onAddNew={handleAddNew}
        onRefresh={() => loadData("manual_refresh")} // <-- WIRED UP
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
      
      {/* 1. Read-only Editor for CRM Cases */}
      {editor.open && editor.mode === 'view' && (
        <EventEditor
          key={editor.ev.id}
          open={true}
          ev={editor.ev}
          clickEvent={editor.clickEvent}
          onClose={handleCloseEditor}
          onChangeDates={applyDates}
        />
      )}
      
      {/* 2. Editable Form for New or Manual Events */}
      {editor.open && (editor.mode === 'new' || editor.mode === 'edit') && (
        <ManualEntryEditor
          key={editor.ev.id}
          open={true}
          ev={editor.ev}
          clickEvent={editor.clickEvent}
          onClose={handleCloseEditor}
          onChangeDates={applyDates}
          onDelete={handleDelete}
          // --- UPDATED: Pass the full lists to the modal ---
          wipOptions={allCrmUsers}
          installerOptions={allServiceAgents}
          ownerOptions={allCrmUsers}
          stateOptions={stateOptions} // State list is fine as-is
        />
      )}

      {/* --- NEW: VISIBLE VERSION NUMBER --- */}
      <div style={versionStyle}>
        Version PROD - v1.4
      </div>
    </div>
  );
}