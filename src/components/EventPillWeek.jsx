// src/components/EventPillWeek.jsx
import React from "react";

// utility: clamp text to N lines using CSS-only (no JS measuring)
const clampStyle = (lines) => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  WebkitLineClamp: lines,
});

// --- FIXED: Added all props to the function signature ---
export default function EventPillWeek({ ev, isMultiDay, className, style, onOpenEditor }) {
  const ref = React.useRef(null);

  // 1 line for title, 1 for meta, 2 for notes = 4 lines total
  const titleStyle = { 
    fontWeight: 600, 
    ...clampStyle(1),
  };
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
    ...style, // Pass through style from parent (contains width and --c color)
    background: ev.colour || "#3b82f6",
    // position: 'relative' is in calendar.css
  };

  // Conditionally add the manual class
  const pillClasses = [
    "event-pill",
    className, // Pass through className from parent
    ev.isManual ? "event-pill--manual" : ""
  ].filter(Boolean).join(" ");

  // Click handler to pass back the DOMRect
  const onClick = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect && onOpenEditor) {
      onOpenEditor(ev, rect);
    }
  };

  return (
    <div 
      ref={ref}
      className={pillClasses} // <-- Use class names
      style={colorStyle}      // Apply background color
      title={ev.title}
      onClick={onClick}       // <-- Add click handler
    >
      {/* Yellow bar is now handled by the .event-pill--manual class */}

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