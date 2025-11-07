// CACHE BUST v3
import React from "react";

type Props = {
  open: boolean;
  clickEvent?: React.MouseEvent | null;
  ev?: any;
  onClose: () => void;
  onChangeDates: (id: string, eventData: any) => void;
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
    if (!clickEvent || !ref.current) {
       setPos({ top: -9999, left: -9999, opacity: 0 });
       return;
    }

    const pop = ref.current.getBoundingClientRect();
    const pad = 12;
    const vw = window.innerWidth;

    const clickY = clickEvent.clientY + window.scrollY;
    const y = clickY - (pop.height / 2);
    const clickX = clickEvent.clientX;
    const x = clickX - (pop.width / 2);

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


export default function EventEditor({ open, clickEvent, ev, onClose, onChangeDates }: Props) {
  const [start, setStart] = React.useState(ev?.start ?? "");
  const [end, setEnd] = React.useState(ev?.end ?? "");
  const { ref, style: positionStyle } = usePopupPosition(open ? (clickEvent || null) : null);

  React.useEffect(() => {
    if (ev) {
      setStart(ev.start ?? "");
      setEnd(ev.end ?? "");
    }
  }, [ev]);

  if (!open || !ev) return null;

  const textColor =
    getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#0f1723";
  const borderColor =
    getComputedStyle(document.documentElement).getPropertyValue("--border").trim() || "#e5e7eb";

  const card: React.CSSProperties = {
    ...positionStyle,
    width: 380,
    background: "#ffffff",
    borderTop: '6px solid #22c55e', // <-- ADDED GREEN LINE
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
    colorScheme: 'light', // <-- FIX: Forces dark text on date fields
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
    // Pass the full event object back, just with new dates
    onChangeDates(ev.id, { ...ev, start, end });
    onClose();
  };

  return (
    <div ref={ref} style={card} role="dialog" aria-labelledby="evt-title">
      {/* Title (Read-only) */}
      <div id="evt-title" style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, lineHeight: 1.25, color: "#666" }} title={ev.title}>
        {ev.title}<hr/>
      </div>

      {/* Meta grid (Read-only) */}
      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <div style={row}>
          <div style={label}>Time</div>
          <div style={{ fontSize: 14, color: "#666" }}>{ev.startTime || "—"}</div>
        </div>
        <div style={row}>
          <div style={label}>WIP Manager</div>
          <div style={{ fontSize: 14, color: "#666" }}>{ev.wipManager || "—"}</div>
        </div>
        <div style={row}>
          <div style={label}>Owner</div>
          <div style={{ fontSize: 14, color: "#666" }}>{ev.caseOwner || "—"}</div>
        </div>
        <div style={row}>
          <div style={label}>Installer</div>
          <div style={{ fontSize: 14, color: "#666" }}>{ev.installer || "—"}</div>
        </div>
        {ev.pmNotes ? (
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 13, color: "#1f2937", opacity: 0.9 }}>PM Notes</div>
            <div style={{ color: "#666", fontSize: 13.5, lineHeight: 1.35, background: "#f9fafb", border: `1px solid ${borderColor}`, borderRadius: 8, padding: "8px 10px" }}>
              {ev.pmNotes}
            </div>
          </div>
        ) : null}
      </div>
      <hr/>

      {/* Dates (Editable) */}
      <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        <div style={row}>
          <div style={label}>Start Date</div>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={input} />
        </div>
        <div style={row}>
          <div style={label}>End Date</div>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} style={input} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          type="button"
          style={primary}
          onClick={handleSave}
        >
          Change Date
        </button>
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
        <button type="button" style={ghost} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}