// src/components/EventPillWeek.jsx
import React from "react";

// utility: clamp text to N lines using CSS-only (no JS measuring)
const clampStyle = (lines) => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  WebkitLineClamp: lines,
});

export default function EventPillWeek({ ev }) {
  // --- STYLING REMOVED ---
  // We now use the 'event-pill' class from calendar.css
  // to ensure the 4-line limit is respected.

  const titleStyle = { fontWeight: 600, ...clampStyle(1) };
  const metaStyle  = { opacity: 0.9, fontSize: 12, ...clampStyle(1) };
  
  // Use 2 lines for notes to fit within the 4-line total
  const notesStyle = { opacity: 0.9, fontSize: 12, ...clampStyle(2) };

  const wip = ev.wipManager || "";
  const ins = ev.installer || "";
  const own = ev.caseOwner || "";
  const line2 = [wip, ins, own].filter(Boolean).join(" | ");

  // The custom --c variable is for the background color
  const cssVars = ev.colour ? { ["--c"]: ev.colour } : {};

  return (
    <div 
      className="event-pill" 
      style={cssVars} 
      title={ev.title}
    >
      <div className="event__fill" />
      <div className="event__label">
        <div style={titleStyle}>{ev.title}</div>
        {line2 && <div style={metaStyle}>{line2}</div>}
        {ev.pmNotes ? <div style={notesStyle}>{ev.pmNotes}</div> : null}
      </div>
    </div>
  );
}