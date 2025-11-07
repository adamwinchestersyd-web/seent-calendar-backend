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
  // 1 line for title, 1 for meta, 2 for notes = 4 lines total
  const titleStyle = { fontWeight: 600, ...clampStyle(1) };
  const metaStyle  = { opacity: 0.9, fontSize: 12, ...clampStyle(1) };
  const notesStyle = { opacity: 0.9, fontSize: 12, ...clampStyle(2) };

  const wip = ev.wipManager || "";
  const ins = ev.installer || "";
  const own = ev.caseOwner || "";
  const line2 = [wip, ins, own].filter(Boolean).join(" | ");

  // Get the background color from the event
  const colorStyle = {
    background: ev.colour || "#3b82f6",
  };

  return (
    <div 
      className="event-pill" 
      style={colorStyle} // Apply background color
      title={ev.title}
    >
      {/* The original CSS file uses event__fill, so we keep it for the gradient */}
      <div className="event__fill" style={{ background: ev.colour || "#3b82f6" }} /> 
      
      <div className="event__label">
        <div style={titleStyle}>{ev.title}</div>
        {line2 && <div style={metaStyle}>{line2}</div>}
        {ev.pmNotes ? <div style={notesStyle}>{ev.pmNotes}</div> : null}
      </div>
    </div>
  );
}