// EventEditor.tsx
// CACHE BUST v62 - FINAL POSITIONING DEFENSE (Full Drop-in)
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
  });

  React.useLayoutEffect(() => {
    if (!open || !clickEvent || !ref.current) {
       setPos({ top: -9999, left: -9999, opacity: 0 });
       return;
    }
    
    const pop = ref.current.getBoundingClientRect();
    const popHeight = pop.height || 300; // Default to 300px if unrendered (NaN defense)
    const popWidth = pop.width || 400;   // Default to 400px if unrendered
    
    const pad = 12;
    const vw = window.innerWidth;
    const clickY = clickEvent.clientY + window.scrollY;
    const clickX = clickEvent.clientX;

    // Calculate Y position
    const y = clickY - (popHeight / 2);
    // Calculate X position
    const x = clickX - (popWidth / 2);

    // Apply strict bounds and check for NaN/Infinity before setting state
    const finalTop = Math.max(pad + window.scrollY, y);
    const finalLeft = Math.max(pad, Math.min(x, vw - popWidth - pad));

    if (!Number.isFinite(finalTop) || !Number.isFinite(finalLeft)) {
        // Log error if calculation is bad, but return to prevent crash
        console.error("Modal position calculation resulted in non-finite value (NaN/Infinity).");
        return; 
    }

    setPos({
      position: 'absolute',
      top: finalTop,
      left: finalLeft,
      opacity: 1,
      transform: 'none',
    });
  }, [open, clickEvent]);

  return { ref, style: pos };
}


export default function EventEditor({ open, clickEvent, ev, onClose, onChangeDates }: Props) {
  const [start, setStart] = React.useState(ev?.start ?? "");
  const [end, setEnd] = React.useState(ev?.end ?? "");
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