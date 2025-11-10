// CACHE BUST v4
import React from "react";
import { useEscapeKey } from "../../hooks/useEscapeKey";

type Props = {
  open: boolean;
  clickEvent?: React.MouseEvent | null;
  ev?: any;
  onClose: () => void;
  onChangeDates: (id: string, eventData: any) => void;
  onDelete: (id: string) => void; // <-- NEW
  wipOptions: string[];
  installerOptions: string[];
  ownerOptions: string[];
  stateOptions: string[];
};

// Positioning hook
function usePopupPosition(clickEvent: React.MouseEvent | null) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<React.CSSProperties>({
    top: -9999,
    left: -9999,
    opacity: 0,
  });

  React.useLayoutEffect(() => {
    const pop = ref.current?.getBoundingClientRect();
    if (!pop) return; 

    const pad = 12;
    const vw = window.innerWidth;
    let y, x;

    if (!clickEvent) {
      y = window.scrollY + 50;
      x = (vw / 2) - (pop.width / 2);
    } else {
      const clickY = clickEvent.clientY + window.scrollY;
      y = clickY - (pop.height / 2);
      const clickX = clickEvent.clientX;
      x = clickX - (pop.width / 2);
    }
    setPos({
      position: 'absolute',
      top: Math.max(pad + window.scrollY, y),
      left: Math.max(pad, Math.min(x, vw - pop.width - pad)),
      opacity: 1,
      transform: 'none',
    });
  }, [clickEvent, open]);

  return { ref, style: pos };
}

interface EventState {
  title: string;
  wipManager: string;
  caseOwner: string;
  installer: string;
  state: string;
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
  onDelete, // <-- NEW
  wipOptions,
  installerOptions,
  ownerOptions,
  stateOptions,
}: Props) {
  
  const [fields, setFields] = React.useState<EventState>({
    title: "",
    wipManager: "",
    caseOwner: "",
    installer: "",
    state: "",
    pmNotes: "",
    startTime: "",
    start: "",
    end: "",
  });

  const { ref, style: positionStyle } = usePopupPosition(open ? (clickEvent || null) : null);

  useEscapeKey(onClose); // Close on Escape key

  React.useEffect(() => {
    if (ev) {
      setFields({
        title: ev.title || "",
        wipManager: ev.wipManager || "",
        caseOwner: ev.caseOwner || "",
        installer: ev.installer || "",
        state: ev.state || "",
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

  const handleSave = () => {
    const updatedEvent = { ...ev, ...fields };
    onChangeDates(ev.id, updatedEvent);
    onClose();
  };

  // --- NEW: Delete handler ---
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this manual entry? This cannot be undone.")) {
      onDelete(ev.id);
    }
  };

  return (
    <div ref={ref} style={positionStyle} className="calendar-editor-modal" role="dialog" aria-labelledby="evt-title">
      
      {/* Title (input) */}
      <div id="evt-title" style={{ marginBottom: 12 }}>
        <input
          type="text"
          name="title"
          placeholder="Event Title"
          value={fields.title}
          onChange={handleChange}
          className="modal-title-input" // Use class
          // Only allow editing title for new events OR existing manual events
          disabled={!isNewEvent && !ev.isManual}
        />
      </div>

      {/* Meta grid - all fields are now editable */}
      <div className="modal-grid">
        <div className="modal-row">
          <div className="modal-label">Time</div>
          <input
            type="text"
            name="startTime"
            placeholder="e.g. 09:00"
            value={fields.startTime}
            onChange={handleChange}
          />
        </div>
        
        {/* WIP Manager Dropdown */}
        <div className="modal-row">
          <div className="modal-label">WIP Manager</div>
          <select
            name="wipManager"
            value={fields.wipManager}
            onChange={handleChange}
          >
            <option value="">Select WIP Manager...</option>
            {wipOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        
        {/* Owner Dropdown */}
        <div className="modal-row">
          <div className="modal-label">Owner</div>
          <select
            name="caseOwner"
            value={fields.caseOwner}
            onChange={handleChange}
          >
            <option value="">Select Owner...</option>
            {ownerOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        
        {/* Installer Dropdown */}
        <div className="modal-row">
          <div className="modal-label">Installer</div>
          <select
            name="installer"
            value={fields.installer}
            onChange={handleChange}
          >
            <option value="">Select Installer...</option>
            {installerOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {/* State Dropdown */}
        <div className="modal-row">
          <div className="modal-label">State</div>
          <select
            name="state"
            value={fields.state}
            onChange={handleChange}
          >
            <option value="">Select State...</option>
            {stateOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        
        {/* PM Notes (textarea) */}
        <div className="modal-grid-gap-sm">
          <div className="modal-label" style={{width: 'auto'}}>PM Notes</div>
          <textarea
            name="pmNotes"
            rows={3}
            value={fields.pmNotes}
            onChange={handleChange}
          />
        </div>
      </div>
      
      {/* Dates */}
      <div className="modal-grid">
        <div className="modal-row">
          <div className="modal-label">Start Date</div>
          <input
            type="date"
            name="start"
            value={fields.start}
            onChange={handleDateChange}
          />
        </div>
        <div className="modal-row">
          <div className="modal-label">End Date</div>
          <input
            type="date"
            name="end"
            value={fields.end}
            onChange={handleDateChange}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="modal-actions">
        {/* --- NEW: Delete Button --- */}
        {!isNewEvent && ev.isManual && (
          <button
            type="button"
            className="modal-btn modal-btn-ghost"
            style={{ color: '#ef4444', marginRight: 'auto' }} // Red, pushed to left
            onClick={handleDelete}
          >
            Remove
          </button>
        )}

        <button
          type="button"
          className="modal-btn modal-btn-primary"
          onClick={handleSave}
        >
          {isNewEvent ? "Save Event" : "Save Changes"}
        </button>
        
        {/* Hide "Go to Case" for new/manual events */}
        {!isNewEvent && !ev.isManual && (
          <button
            type="button"
            className="modal-btn modal-btn-subtle"
            onClick={() => {
              const url = ev.caseUrl || ev.url || (ev.caseId ? `https://crm.zoho.com/crm/org640578001/tab/Cases/${ev.caseId}` : "");
              if (url) window.open(url, "_blank");
            }}
          >
            Go to Case
          </button>
        )}
        
        <button type="button" className="modal-btn modal-btn-ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}