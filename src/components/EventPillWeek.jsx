// EventPillWeek.jsx
// CACHE BUST v57 - SYNTHETIC MOUSE DOWN FIX (Full Drop-in)
import React from "react";

// utility: clamp text to N lines using CSS-only (no JS measuring)
const clampStyle = (lines) => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  WebkitLineClamp: lines,
});

export default function EventPillWeek({ ev, isMultiDay, className, style, onOpenEditor }) {
  const ref = React.useRef(null);

  // 1 line for title, 1 for meta, 2 for notes = 4 lines total
  const titleStyle = { fontWeight: 600, ...clampStyle(1) };
  const metaStyle  = { opacity: 0.9, fontSize: 12, ...clampStyle(1) };
  const notesStyle = { opacity: 0.9, fontSize: 12, ...clampStyle(2) };

  const wip = ev.wipManager || "";
  const ins = ev.installer || "";
  const own = ev.caseOwner || "";
  const line2 = [wip, ins, own].filter(Boolean).join(" | ");

  // Merge incoming style (width: 100%) with our background color
  const colorStyle = {
    ...style, 
    position: "relative",
    background: ev.colour || "#3b82f6",
    boxSizing: "border-box",
  };

  const pillClasses = [
    "event-pill",
    className, 
    ev.isManual ? "event-pill--manual" : ""
  ].filter(Boolean).join(" ");

  // --- CRITICAL FIX: Attach native event listener ---
  React.useEffect(() => {
    const node = ref.current;
    if (!node || !onOpenEditor) return;

    const handleMouseDown = (e) => {
        // Prevent event from bubbling up and triggering grid/cell handlers
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Use coordinates from the native event
        onOpenEditor(ev, { clientY: e.clientY, clientX: e.clientX });
    };

    // Attach listener to capture event early
    node.addEventListener('mousedown', handleMouseDown);

    return () => {
        node.removeEventListener('mousedown', handleMouseDown);
    };
  }, [ev, onOpenEditor]); // Re-attach if event data or handler changes

  return (
    <div 
      ref={ref}
      className={pillClasses} 
      style={{...colorStyle, cursor: 'pointer'}} // Enforce pointer cursor
      title={ev.title}
      // onClick REMOVED!
    >
      <div className="event__fill" style={{ background: ev.colour || "#3b82f6" }} /> 
      
      <div className="event__label">
        <div style={titleStyle}>{ev.title}</div>
        {line2 && <div style={metaStyle}>{line2}</div>}
        {ev.pmNotes ? <div style={notesStyle}>{ev.pmNotes}</div> : null}
      </div>
    </div>
  );
}