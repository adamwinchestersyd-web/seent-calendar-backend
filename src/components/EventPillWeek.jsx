// CACHE BUST v17
import React from "react";

// utility: clamp text to N lines using CSS-only
const clampStyle = (lines) => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  WebkitLineClamp: lines,
});

// --- FIXED: Added isMultiDay and ...props ---
export default function EventPillWeek({ ev, style, className, onOpenEditor, isMultiDay, ...props }) {
  const titleStyle = { fontWeight: 600, ...clampStyle(1) };
  const metaStyle  = { opacity: 0.9, fontSize: 12, ...clampStyle(1) };
  const notesStyle = { opacity: 0.9, fontSize: 12, ...clampStyle(2) };

  const wip = ev.wipManager || "";
  const ins = ev.installer || "";
  const own = ev.caseOwner || "";
  const line2 = [wip, ins, own].filter(Boolean).join(" | ");

  // Merge styles, FORCE width 100%
  const colorStyle = {
    ...style,
    width: "100%", 
    boxSizing: "border-box",
    background: ev.colour || "#3b82f6",
  };

  const onClick = (e) => {
    e.stopPropagation();
    if (onOpenEditor) {
      const rect = e.currentTarget.getBoundingClientRect();
      // Pass fake event structure matching what Calendar.jsx expects
      onOpenEditor(ev, { clientY: rect.top, clientX: rect.left });
    }
  };

  return (
    <div 
      className={`event-pill ${className || ""}`} 
      style={colorStyle}
      title={ev.title}
      onClick={onClick}
      {...props}
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