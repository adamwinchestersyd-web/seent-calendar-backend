import React from "react";

type Props = {
  open: boolean;
  clickEvent?: React.MouseEvent | null;
  ev?: any;
  onClose: () => void;
  onChangeDates: (id: string, eventData: any) => void;
  wipOptions: string[];
  installerOptions: string[];
  ownerOptions: string[];
};

// --- UPDATED: This hook now positions the "Add New" modal simply ---
function usePopupPosition(clickEvent: React.MouseEvent | null) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<React.CSSProperties>({
    top: -9999,
    left: -9999,
    opacity: 0, // Start hidden
  });

  React.useLayoutEffect(() => {
    const pop = ref.current?.getBoundingClientRect();
    if (!pop) return; // Don't calculate if the popup isn't rendered yet

    const pad = 12;
    const vw = window.innerWidth;

    let y, x;

    if (!clickEvent) {
      // --- "Add New" Mode (No Click) ---
      // Position it at the top-center of the current scroll view
      y = window.scrollY + 50; // 50px from the top of the viewport
      x = (vw / 2) - (pop.width / 2); // Centered horizontally
    } else {
      // --- Click Mode ---
      // Calculate Y position relative to the PAGE (including scroll)
      const clickY = clickEvent.clientY + window.scrollY;
      y = clickY - (pop.height / 2); // Center vertically on the click

      // Calculate X position
      const clickX = clickEvent.clientX;
      x = clickX - (pop.width / 2); // Center horizontally on the click
    }

    setPos({
      position: 'absolute', // Always use absolute positioning
      top: Math.max(pad + window.scrollY, y), // Ensure it's on screen vertically
      left: Math.max(pad, Math.min(x, vw - pop.width - pad)), // On screen horizontally
      opacity: 1,
      transform: 'none',
    });
  }, [clickEvent, open]); // Recalculate if the click event or open state changes

  return { ref, style: pos };
}

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

export default function ManualEntryEditor({
  open,
  clickEvent,
  ev,
  onClose,
  onChangeDates,
  wipOptions,
  installerOptions,
  ownerOptions,
}: Props) {
  
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

  const { ref, style: positionStyle } = usePopupPosition(open ? (clickEvent || null) : null);

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
  }, [ev]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFields(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFields(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (!open || !ev) return null;
  
  const isNewEvent = !!ev.isNew;

  const textColor =
    getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#0f1723";
  const borderColor =
    getComputedStyle(document.documentElement).getPropertyValue("--border").trim() || "#e5e7eb";

  const card: React.CSSProperties = {
    ...positionStyle, // Apply the calculated position here
    width: 380,
    background: "#ffffff",
    color: textColor,
    border: `1px solid ${borderColor}`,
    borderRadius: 12,
    boxShadow: "0 12px 32px rgba(0,0,0,.22)",
    padding: 18,
    zIndex: 9999,
    transition: 'opacity 150ms ease-in-out',
  };

  const row: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center" };
  const label: React.CSSProperties = { fontSize: 13, width: 110, color: "#1f2937", opacity: 0.9 };
  
  // --- UPDATED: Added colorScheme ---
  const input: React.CSSProperties = {
    flex: 1,
    height: 36,
    padding: "0 10px",
    borderRadius: 8,
    border: `1px solid ${borderColor}`,
    background: "#fff",
    color: textColor, 
    colorScheme: 'light', // <-- FIX: Forces dark text on all fields
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

  const handleSave = () => {
    const updatedEvent = { ...ev, ...fields };
    onChangeDates(ev.id, updatedEvent);
    onClose();
  };

  return (
    <div ref={ref} style={card} role="dialog" aria-labelledby="evt-title">
      
      {/* Title (input) */}
      <div id="evt-title" style={{ marginBottom: 12 }}>
        <input
          type="text"
          name="title"
          placeholder="Event Title"
          value={fields.title}
          onChange={handleChange}
          style={{...input, height: 40, fontSize: 15, fontWeight: 700 }}
          // Only allow editing title for new events OR existing manual events
          disabled={!isNewEvent && !ev.isManual}
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
        
        {/* WIP Manager Dropdown */}
        <div style={row}>
          <div style={label}>WIP Manager</div>
          <select
            name="wipManager"
            value={fields.wipManager}
            onChange={handleChange}
            style={input}
          >
            <option value="">Select WIP Manager...</option>
            {wipOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        
        {/* Owner Dropdown */}
        <div style={row}>
          <div style={label}>Owner</div>
          <select
            name="caseOwner"
            value={fields.caseOwner}
            onChange={handleChange}
            style={input}
          >
            <option value="">Select Owner...</option>
            {ownerOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        
        {/* Installer Dropdown */}
        <div style={row}>
          <div style={label}>Installer</div>
          <select
            name="installer"
            value={fields.installer}
            onChange={handleChange}
            style={input}
          >
            <option value="">Select Installer...</option>
            {installerOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        
        {/* PM Notes (textarea) */}
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
        
        {/* Hide "Go to Case" for new/manual events */}
        {!isNewEvent && !ev.isManual && (
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