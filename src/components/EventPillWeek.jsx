// EventPillWeek.jsx
// CACHE BUST v56 - FINAL CLICK FIX (Inline Enforcement)
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

  const onClick = (e) => {
    e.stopPropagation(); 
    e.nativeEvent.stopImmediatePropagation(); // Defensive fix for cancellation
    if (onOpenEditor) {
      const rect = e.currentTarget.getBoundingClientRect();
      onOpenEditor(ev, { clientY: rect.top, clientX: rect.left });
    }
  };

  return (
    <div 
      ref={ref}
      className={pillClasses} 
      style={{...colorStyle, cursor: 'pointer'}} // Enforce pointer cursor
      title={ev.title}
      onClick={onClick}
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