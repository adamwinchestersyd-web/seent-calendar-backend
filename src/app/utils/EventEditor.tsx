// EventEditor.tsx
// CACHE BUST v64 - TOP-RIGHT MOUSE POSITIONING (Full Drop-in)
import React from "react";
import { useEscapeKey } from "../../hooks/useEscapeKey";

type Props = {
  open: boolean;
  clickEvent?: React.MouseEvent | null;
  ev?: any;
  onClose: () => void;
  onChangeDates: (id: string, eventData: any) => void;
};

// Positioning hook
function usePopupPosition(open: boolean, clickEvent: React.MouseEvent | null) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<React.CSSProperties>({
    top: -9999,
    left: -9999,
    opacity: 0,
    position: 'fixed' // Use fixed position to avoid scroll issues
  });

  React.useLayoutEffect(() => {
    if (!open || !clickEvent || !ref.current) {
       setPos({ top: -9999, left: -9999, opacity: 0, position: 'fixed' });
       return;
    }
    
    // --- POSITIONING LOGIC FOR TOP RIGHT HAND SIDE OF CLICK ---
    const pop = ref.current.getBoundingClientRect();
    const pad = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    const clickY = clickEvent.clientY;
    const clickX = clickEvent.clientX;

    // Offset (Move modal slightly up and right/left relative to click)
    const offsetY = -20; // Move 20px up from the click point
    const offsetX = 20; // Move 20px right from the click point

    let finalTop = clickY + offsetY;
    let finalLeft = clickX + offsetX;
    
    // Ensure finalLeft is constrained (stay on screen)
    if (finalLeft + pop.width + pad > vw) {
        // If it overflows right, move it to the left of the click point
        finalLeft = clickX - pop.width - offsetX;
    }
    
    // Ensure finalTop is constrained (stay on screen)
    if (finalTop < pad) {
        finalTop = pad;
    } else if (finalTop + pop.height > vh) {
        // If it overflows bottom, move it up to the bottom edge
        finalTop = vh - pop.height - pad;
    }
    
    // Apply strict final checks
    const finalTopSafe = Number.isFinite(finalTop) ? finalTop : vh * 0.5;
    const finalLeftSafe = Number.isFinite(finalLeft) ? finalLeft : vw * 0.5;

    setPos({
      position: 'fixed',
      top: finalTopSafe,
      left: finalLeftSafe,
      opacity: 1,
      transform: 'none',
    });
  }, [open, clickEvent]);

  return { ref, style: pos };
}


export default function EventEditor({ open, clickEvent, ev, onClose, onChangeDates }: Props) {
  const [start, setStart] = React.useState(ev?.start ?? "");
  const [end, setEnd] = React.useState(ev?.end ?? "");
  // --- FIXED: Pass clickEvent again, rely on hook constraints ---
  const { ref, style: positionStyle } = usePopupPosition(open, open ? (clickEvent || null) : null); 

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