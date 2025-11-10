// src/components/EventPillWeek.jsx
import React from "react";
import EventPillNames from "./EventPillNames"; // <-- IMPORT THE NEW COMPONENT

// utility: clamp text to N lines using CSS-only (no JS measuring)
const clampStyle = (lines) => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  WebkitLineClamp: lines,
});

export default function EventPillWeek({ ev }) {
  // 1 line for title, 2 for notes
  const titleStyle = { fontWeight: 600, ...clampStyle(1) };
  const notesStyle = { opacity: 0.9, fontSize: 12, ...clampStyle(2) };

  // --- All meta line logic has been MOVED to EventPillNames.jsx ---

  // Get the background color from the event
  const colorStyle = {
    background: ev.colour || "#3b82f6",
    // position: 'relative' is in calendar.css
  };

  // Conditionally add the manual class
  const pillClasses = [
    "event-pill",
    ev.isManual ? "event-pill--manual" : ""
  ].filter(Boolean).join(" ");

  return (
    <div 
      className={pillClasses} // <-- Use class names
      style={colorStyle}      // Apply background color
      title={ev.title}
    >
      {/* Yellow bar is now handled by the .event-pill--manual class */}

      {/* The original CSS file uses event__fill, so we keep it for the gradient */}
      <div className="event__fill" style={{ background: ev.colour || "#3b82f6" }} /> 
      
      <div className="event__label">
        <div style={titleStyle}>{ev.title}</div>
        
        {/* --- USE THE NEW COMPONENT --- */}
        <EventPillNames ev={ev} />
        
        {ev.pmNotes ? <div style={notesStyle}>{ev.pmNotes}</div> : null}
      </div>
    </div>
  );
}