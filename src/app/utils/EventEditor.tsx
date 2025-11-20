// EventEditor.tsx
// CACHE BUST v66 - RESTORE DYNAMIC MODAL POSITIONING (Fix to place at cursor with boundary check)
import React from "react";
import { useEscapeKey } from "../../hooks/useEscapeKey";

// Define a type for the coordinates object passed from EventPill components
type Coordinates = { 
  clientX: number; 
  clientY: number; 
};

type Props = {
  open: boolean;
  clickEvent?: Coordinates; // Accepts coordinates object from the event pill
  ev?: any;
  onClose: () => void;
  onChangeDates: (id: string, eventData: any) => void;
};

// Positioning hook - now accepts clickEvent for dynamic positioning
function usePopupPosition(open: boolean, clickEvent?: Coordinates) { 
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<React.CSSProperties>({
    top: -9999,
    left: -9999,
    opacity: 0,
    position: 'absolute'
  });

  React.useLayoutEffect(() => {
    // 1. Hide and reset position if not open
    if (!open) {
       setPos({ top: -9999, left: -9999, opacity: 0, position: 'absolute' });
       return;
    }

    // 2. If open, but coordinates are missing (fall back to fixed center position)
    if (!clickEvent || typeof clickEvent.clientX !== 'number' || typeof clickEvent.clientY !== 'number') {
        // This is the fallback to the previous fixed-center position
        setPos({
            position: 'absolute',
            top: 100, 
            left: '50%',
            transform: 'translateX(-50%)', 
            opacity: 1,
        });
        return;
    }
    
    // --- Dynamic Positioning Logic ---
    
    // Modal dimensions and offsets
    const modalWidth = 360; 
    // Use actual height if ref is ready (after first render), otherwise use a safe estimate.
    const modalHeight = ref.current ? ref.current.offsetHeight : 300; 
    const margin = 10; // Minimum margin from viewport edges
    const clickPointOffset = 10; // Offset to place the modal slightly below the cursor
    
    let { clientX, clientY } = clickEvent;
    
    // Initial position: center modal horizontally on the click X, and 10px below click Y
    let left = clientX - (modalWidth / 2);
    let top = clientY + clickPointOffset; 

    // --- Viewport boundary checks ---
    
    // 1. Keep left edge visible
    if (left < margin) {
      left = margin;
    }

    // 2. Keep right edge visible
    if (left + modalWidth + margin > window.innerWidth) {
      // Shift left to fit in viewport
      left = window.innerWidth - modalWidth - margin;
    }
    
    // 3. Keep bottom edge visible (prefer opening upwards if near the bottom of the viewport)
    if (top + modalHeight + margin > window.innerHeight) {
        // Recalculate top to open above the click point
        top = clientY - modalHeight - clickPointOffset; 

        // If it still goes off the top (unlikely), just place it at the top margin
        if (top < margin) {
            top = margin;
        }
    }
    
    // Final calculated position
    setPos({
      position: 'absolute',
      top: Math.round(top),
      left: Math.round(left),
      width: modalWidth, // Set explicit width
      transform: 'none', // Remove the horizontal centering transform
      opacity: 1,
      zIndex: 1000 // Ensure it's on top of other calendar elements
    });

  }, [open, clickEvent]); // Depends on 'open' AND 'clickEvent'

  return { ref, style: pos };
}


export default function EventEditor({ open, clickEvent, ev, onClose, onChangeDates }: Props) {
  const [start, setStart] = React.useState(ev?.start ?? "");
  const [end, setEnd] = React.useState(ev?.end ?? "");
  // FIXED: Pass clickEvent to hook for dynamic positioning
  const { ref, style: positionStyle } = usePopupPosition(open, clickEvent); 

  useEscapeKey(onClose); // Close on Escape key
  
  React.useEffect(() => {
    if (ev) {
      setStart(ev.start ?? "");
      setEnd(ev.end ?? "");
    }
  }, [ev]);

  if (!open || !ev) return null;
  
  const handleSave = () => {
    // Pass the full event object back, just with new dates
    onChangeDates(ev.id, { ...ev, start, end });
    onClose();
  };

  return (
    <div ref={ref} style={positionStyle} className="calendar-editor-modal" role="dialog" aria-labelledby="evt-title">
      {/* Title (Read-only) */}
      <div id="evt-title" style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, lineHeight: 1.25, color: "#666" }} title={ev.title}>
        {ev.title}<hr/>
      </div>

      {/* Meta grid (Read-only) */}
      <div className="modal-grid" style={{ gap: 8, marginBottom: 12 }}>
        <div className="modal-row">
          <div className="modal-label">Time</div>
          <div className="modal-info-text">{ev.startTime || "—"}</div>
        </div>
        <div className="modal-row">
          <div className="modal-label">WIP Manager</div>
          <div className="modal-info-text">{ev.wipManager || "—"}</div>
        </div>
        <div className="modal-row">
          <div className="modal-label">Owner</div>
          <div className="modal-info-text">{ev.caseOwner || "—"}</div>
        </div>
        <div className="modal-row">
          <div className="modal-label">Installer</div>
          <div className="modal-info-text">{ev.installer || "—"}</div>
        </div>
        {ev.pmNotes ? (
          <div className="modal-grid-gap-sm">
            <div className="modal-label" style={{width: 'auto'}}>PM Notes</div>
            <div className="modal-notes-box">
              {ev.pmNotes}
            </div>
          </div>
        ) : null}
      </div>
      <hr/>

      {/* Dates (Editable) */}
      <div className="modal-grid">
        <div className="modal-row">
          <div className="modal-label">Start Date</div>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="modal-row">
          <div className="modal-label">End Date</div>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>

      {/* Actions */}
      <div className="modal-actions">
        <button
          type="button"
          className="modal-btn modal-btn-primary"
          onClick={handleSave}
        >
          Change Date
        </button>
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
        <button type="button" className="modal-btn modal-btn-ghost" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}