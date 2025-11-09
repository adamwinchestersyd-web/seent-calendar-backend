// FORCE V3 UPDATE
import React from "react";

// utility: clamp text to N lines using CSS-only (no JS measuring)
const clampStyle = (lines) => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  WebkitLineClamp: lines,
});

// Style for the manual entry bar
const manualEntryBarStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  height: '5px',
  backgroundColor: '#facc15', // Using 'SA' yellow for consistency
  zIndex: 2,
};

export default function EventPillWeek({ ev }) {
  // 1 line for title, 1 for meta, 2 for notes = 4 lines total
  const titleStyle = { fontWeight: 600, ...clampStyle(1) };
  const metaStyle  = { opacity: 0.9, fontSize: 12, ...clampStyle(1) };
  const notesStyle = { opacity: 0.9, fontSize: 12, ...clampStyle(2) };

  // --- Meta line: WIP Manager | Installer | Start time | Owner ---
  const wip = ev.wipManager || "";
  const ins = ev.installer || "";
  const time = ev.startTime || "";
  const own = ev.caseOwner || "";
  
  const line2 = [wip, ins, time, own].filter(Boolean).join(" | ");

  // Get the background color from the event
  const colorStyle = {
    background: ev.colour || "#3b82f6",
    // position: 'relative' is now in calendar.css
  };

  return (
    <div 
      className="event-pill" 
      style={colorStyle} // Apply background color
      title={ev.title}
    >
      {/* Yellow bar for manual entries */}
      {ev.isManual && <div style={manualEntryBarStyle} />}

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