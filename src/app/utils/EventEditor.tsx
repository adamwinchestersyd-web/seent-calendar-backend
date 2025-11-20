// EventEditor.tsx
// CACHE BUST v69 - ROBUST DYNAMIC MODAL POSITIONING (TS Fix and Final Logic)
import React, { CSSProperties } from "react"; 
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

// Positioning hook - uses dynamic position if coordinates are available, otherwise falls back to fixed center.
function usePopupPosition(open: boolean, clickEvent?: Coordinates) { 
  const ref = React.useRef<HTMLDivElement>(null);
  
  // Extract coordinates outside of the effect to use them in the dependency array
  const clientX = clickEvent?.clientX;
  const clientY = clickEvent?.clientY;

  // Use CSSProperties for type safety
  const [pos, setPos] = React.useState<CSSProperties>({
    top: -9999,
    left: -9999,
    opacity: 0,
    position: 'absolute'
  });

  React.useLayoutEffect(() => {
    // DEBUG LOGS
    console.log("--- Modal Positioning Check (Start) ---");
    console.log(`Open State: ${open}`);
    console.log(`Click Coords: (${clientX}, ${clientY})`);
    // END DEBUG LOGS

    // 1. Hide and reset position if not open
    if (!open) {
       console.log("Action: Modal is closed. Resetting position.");
       setPos({ top: -9999, left: -9999, opacity: 0, position: 'absolute' });
       console.log("--- Modal Positioning Check (End) ---");
       return;
    }

    // --- Default Fallback Position (Top Center) ---
    let left: number | string = '50%';
    let top: number = 100;
    let transform: CSSProperties['transform'] = 'translateX(-50%)'; 
    let width: number | string = 'auto'; 
    const modalWidth = 360; 
    let position: CSSProperties['position'] = 'absolute'; 

    // Check if we have valid coordinates to use dynamic positioning
    const hasValidCoords = typeof clientX === 'number' && typeof clientY === 'number' &&
                           (clientX > 0 || clientY > 0); 

    if (hasValidCoords) {
        // --- Dynamic Positioning Logic ---
        console.log("Status: Valid coordinates detected. Applying dynamic positioning.");

        // Use actual height if ref is ready, otherwise use a safe estimate.
        const actualHeight = ref.current ? ref.current.offsetHeight : 0;
        const modalHeight = actualHeight || 300; 
        console.log(`Modal DOM Ref Ready: ${!!ref.current}`);
        console.log(`Modal Height (Actual/Estimate): ${actualHeight || '300 (Estimate)'}`);
        
        const margin = 10; 
        const clickPointOffset = 10; 
        
        // Initial calculation: clientX/clientY are guaranteed to be numbers here
        left = clientX - (modalWidth / 2); 
        top = clientY + clickPointOffset; 
        console.log(`Initial Position: (L:${left}, T:${top})`);

        // --- Viewport boundary checks ---
        
        // 1. Keep left edge visible
        if (left < margin) {
          left = margin;
          console.log(`Boundary Adjust: Left clipped to ${left}`);
        }

        // 2. Keep right edge visible
        if (typeof left === 'number' && left + modalWidth + margin > window.innerWidth) {
          left = window.innerWidth - modalWidth - margin;
          console.log(`Boundary Adjust: Right clipped to ${left}`);
        }
        
        // 3. Keep bottom edge visible (prefer opening upwards if near the bottom of the viewport)
        if (top + modalHeight + margin > window.innerHeight) {
            // Recalculate top to open above the click point
            top = clientY - modalHeight - clickPointOffset; 
            console.log(`Boundary Adjust: Opening upwards. New Top: ${top}`);

            // If it still goes off the top, place it at the top margin
            if (top < margin) {
                top = margin;
                console.log(`Boundary Adjust: Top clipped to ${top}`);
            }
        }
        
        // Override default fallback values
        transform = 'none'; 
        width = modalWidth; 
    } else {
        console.log("Status: Coordinates not valid/available. Falling back to fixed center position (100px from top).");
        // Use the existing default/fallback values
    }
    
    // Final calculated position (either dynamic or fallback)
    const finalPos: CSSProperties = {
      position: position, 
      top: Math.round(top),
      left: typeof left === 'number' ? Math.round(left) : left, 
      width: width,
      transform: transform,
      opacity: 1,
      zIndex: 1000 
    };
    
    console.log("Final Calculated Style:", finalPos);
    setPos(finalPos);
    console.log("--- Modal Positioning Check (End) ---");

  }, [open, clientX, clientY]); 

  return { ref, style: pos };
}


export default function EventEditor({ open, clickEvent, ev, onClose, onChangeDates }: Props) {
  const [start, setStart] = React.useState(ev?.start ?? "");
  const [end, setEnd] = React.useState(ev?.end ?? "");
  // Pass clickEvent to hook for dynamic positioning
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