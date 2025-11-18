// src/components/EventPillWeek.jsx
import React from "react";

// --- NEW: Helper functions to get first name ---
function asName(v) {
  if (!v) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object") {
    if (typeof v.name === "string") return v.name.trim();
    if (typeof v.display_value === "string") return v.display_value.trim();
    const first = typeof v.first_name === "string" ? v.first_name.trim() : "";
    const last = typeof v.last_name === "string" ? v.last_name.trim() : "";
    return `${first} ${last}`.trim();
  }
  return "";
}

function firstWord(v) {
  const s = asName(v);
  return s ? s.split(/\s+/)[0] : "";
}

// utility: clamp text to N lines using CSS-only (no JS measuring)
const clampStyle = (lines) => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  WebkitLineClamp: lines,
});

// --- FIXED: Added className and style to props ---
export default function EventPillWeek({ ev, isMultiDay, className, style, onOpenEditor }) {
  const ref = React.useRef(null);

  // 1 line for title, 1 for meta, 2 for notes = 4 lines total
  const titleStyle = { 
    fontWeight: 600, 
    ...clampStyle(1),
  };
  const metaStyle  = { opacity: 0.9, fontSize: 12, ...clampStyle(1) };
  const notesStyle = { opacity: 0.9, fontSize: 12, ...clampStyle(2) };

  const wip = firstWord(ev.wipManager) || "";
  const ins = asName(ev.installer) || ""; 
  const time = ev.startTime || "";
  const own = firstWord(ev.caseOwner) || "";
  
  const line2 = [wip, ins, time, own].filter(Boolean).join(" | ");

  // Get the background color from the event
  const colorStyle = {
    ...style, // Pass through style from parent (contains width and position)
    background: ev.colour || "#3b82f6",
  };

  // Conditionally add the manual class
  const pillClasses = [
    "event-pill", // This applies the calendar.css 4-line limit
    className, 
    ev.isManual ? "event-pill--manual" : ""
  ].filter(Boolean).join(" ");

  // Click handler to pass back the DOMRect
  const onClick = (e) => {
    // Stop propagation so we don't trigger the cell click
    e.stopPropagation();
    
    const rect = ref.current?.getBoundingClientRect();
    if (rect && onOpenEditor) {
      // Convert rect to a fake MouseEvent structure so Calendar.jsx is happy
      onOpenEditor(ev, { clientY: rect.top, clientX: rect.left });
    }
  };

  return (
    <div 
      ref={ref}
      className={pillClasses} 
      style={colorStyle}      
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