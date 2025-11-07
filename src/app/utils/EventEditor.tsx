import React from "react";

type Props = {
  open: boolean;
  clickEvent?: React.MouseEvent | null;
  ev?: any;
  onClose: () => void;
  // This prop is changed to pass the whole event object back
  onChangeDates: (id: string, eventData: any) => void;
};

// This is the new positioning hook that replaces the old `place()` function
function usePopupPosition(clickEvent: React.MouseEvent | null) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<React.CSSProperties>({
    top: -9999,
    left: -9999,
    opacity: 0, // Start hidden
  });

  React.useLayoutEffect(() => {
    if (!clickEvent) {
      // If no click event (like 'Add New'), center it.
      // We set a default position, but it will be centered by the effect below.
      setPos({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        opacity: 1,
      });
      return;
    }

    const pop = ref.current?.getBoundingClientRect();
    if (!pop) return; // Don't calculate if the popup isn't rendered yet

    const pad = 12;
    const vw = window.innerWidth;

    // Calculate Y position relative to the PAGE (including scroll)
    const clickY = clickEvent.clientY + window.scrollY;
    const y = clickY - (pop.height / 2); // Center vertically on the click

    // Calculate X position
    const clickX = clickEvent.clientX;
    const x = clickX - (pop.width / 2); // Center horizontally on the click

    setPos({
      // Ensure it doesn't go off-screen vertically
      top: Math.max(pad + window.scrollY, y),
      // Ensure it doesn't go off-screen horizontally
      left: Math.max(pad, Math.min(x, vw - pop.width - pad)),
      opacity: 1, // Make visible
      transform: 'none', // Reset transform
    });
  }, [clickEvent, open]); // Recalculate if the click event or open state changes

  return { ref, style: pos };
}

// --- NEW STATE INTERFACE ---
// We'll manage all event fields in state
interface EventState {
  title: string;
  wipManager: string;
  caseOwner: string; // 'Owner' in the form
  installer: string;
  pmNotes: string;
  startTime: string;
  start: string;
  end: string;
}

export default function EventEditor({ open, clickEvent, ev, onClose, onChangeDates }: Props) {
  
  // --- NEW: State for all fields ---
  const [fields, setFields] = React.useState<EventState>({
    title: "",
    wipManager: "",
    caseOwner: "",
    installer: "",
    pmNotes: "",
    startTime: "",
    start: "",
    end: "",
  });

  // Get the ref and style from our new hook
  const { ref, style: positionStyle } = usePopupPosition(open ? (clickEvent || null) : null);

  // --- UPDATED: Load full event into state ---
  React.useEffect(() => {
    if (ev) {
      setFields({
        title: ev.title || "",
        wipManager: ev.wipManager || "",
        caseOwner: ev.caseOwner || "", // 'Owner'
        installer: ev.installer || "",
        pmNotes: ev.pmNotes || "",
        startTime: ev.startTime || "",
        start: ev.start || "",
        end: ev.end || "",
      });
    }
  }, [ev]); // This runs when 'ev' changes

  // --- NEW: Generic handler for text inputs ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFields(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  // --- NEW: Handler for date inputs ---
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFields(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (!open || !ev) return null;
  
  const isNewEvent = !!ev.isNew; // Check if this is a new manual entry

  // --- Styles (no changes from here down) ---
  const textColor =
    getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#0f1723";
  const borderColor =
    getComputedStyle(document.documentElement).getPropertyValue("--border").trim() || "#e5e7eb";

  const card: React.CSSProperties = {
    position: "absolute",
    ...positionStyle, // Apply the calculated position here
    width: 380,
    background: "#ffffff",
    color: textColor,
    border: `1px solid ${borderColor}`,
    borderRadius: 12,
    boxShadow: "0 12px 32px rgba(0,0,0,.22)",
    padding: 18,
    zIndex: 9999,
    transition: 'opacity 150ms ease-in-out', // Added for smooth fade-in
  };

  const row: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center" };
  const label: React.CSSProperties = { fontSize: 13, width: 110, color: "#1f2937", opacity: 0.9 };
  const input: React.CSSProperties = {
    flex: 1,
    height: 36,
    padding: "0 10px",
    borderRadius: 8,
    border: `1px solid ${borderColor}`,
    background: "#fff",
  };
  const textArea: React.CSSProperties = {
    ...input,
    height: 'auto',
    padding: '8px 10px',
  };

  const baseBtn: React.CSSProperties = {
    height: 36,
    padding: "0 14px",
    borderRadius: 10,
    border: `1px solid ${borderColor}`,
    fontSize: 14,
    cursor: "pointer",
    userSelect: "none",
  };
  const primary: React.CSSProperties = { ...baseBtn, background: "#111827", color: "#fff", borderColor: "#111827" };
  const subtle: React.CSSProperties = { ...baseBtn, background: "#f3f4f6", color: "#111827" };
  const ghost: React.CSSProperties = { ...baseBtn, background: "transparent" };

  // --- UPDATED: Handle Save button click ---
  const handleSave = () => {
    // Merge the original event data with the new fields
    const updatedEvent = { ...ev, ...fields };
    onChangeDates(ev.id, updatedEvent);
    onClose();
  };

  return (
    <div ref={ref} style={card} role="dialog" aria-labelledby="evt-title">
      
      {/* --- UPDATED: Title is now an input --- */}
      <div id="evt-title" style={{ marginBottom: 12 }}>
        <input
          type="text"
          name="title"
          placeholder="Event Title"
          value={fields.title}
          onChange={handleChange}
          style={{...input, height: 40, fontSize: 15, fontWeight: 700 }}
        />
      </div>

      {/* Meta grid - all fields are now editable */}
      <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        <div style={row}>
          <div style={label}>Time</div>
          <input
            type="text"
            name="startTime"
            placeholder="e.g. 09:00"
            value={fields.startTime}
            onChange={handleChange}
            style={input}
          />
        </div>
        <div style={row}>
          <div style={label}>WIP Manager</div>
          <input
            type="text"
            name="wipManager"
            value={fields.wipManager}
            onChange={handleChange}
            style={input}
          />
        </div>
        <div style={row}>
          <div style={label}>Owner</div>
          <input
            type="text"
            name="caseOwner"
            value={fields.caseOwner}
            onChange={handleChange}
            style={input}
          />
        </div>
        <div style={row}>
          <div style={label}>Installer</div>
          <input
            type="text"
            name="installer"
            value={fields.installer}
            onChange={handleChange}
            style={input}
          />
        </div>
        
        {/* --- UPDATED: PM Notes is now a textarea --- */}
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 13, color: "#1f2937", opacity: 0.9 }}>PM Notes</div>
          <textarea
            name="pmNotes"
            rows={3}
            value={fields.pmNotes}
            onChange={handleChange}
            style={textArea}
          />
        </div>
      </div>
      
      {/* Dates */}
      <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        <div style={row}>
          <div style={label}>Start Date</div>
          <input
            type="date"
            name="start"
            value={fields.start}
            onChange={handleDateChange}
            style={input}
          />
        </div>
        <div style={row}>
          <div style={label}>End Date</div>
          <input
            type="date"
            name="end"
            value={fields.end}
            onChange={handleDateChange}
            style={input}
          />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          style={primary}
          onClick={handleSave}
        >
          {isNewEvent ? "Save Event" : "Save Changes"}
        </button>
        
        {/* --- UPDATED: Hide "Go to Case" for new events --- */}
        {!isNewEvent && (
          <button
            type="button"
            style={subtle}
            onClick={() => {
              const url = ev.caseUrl || ev.url || (ev.caseId ? `https.crm.zoho.com/crm/org640578001/tab/Cases/${ev.caseId}` : "");
              if (url) window.open(url, "_blank");
            }}
          >
            Go to Case
          </button>
        )}
        
        <button type="button" style={ghost} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}