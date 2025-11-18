// src/components/EventPillWeek.jsx
import React from "react";

// --- Helper functions ---
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

// utility: clamp text to N lines using CSS-only
const clampStyle = (lines) => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  WebkitLineClamp: lines,
});

// --- FIXED: Added 'style' prop ---
export default function EventPillWeek({ ev, isMultiDay, className, style, onOpenEditor }) {
  const ref = React.useRef(null);

  const titleStyle = { fontWeight: 600, ...clampStyle(1) };
  const metaStyle  = { opacity: 0.9, fontSize: 12, ...clampStyle(1) };
  const notesStyle = { opacity: 0.9, fontSize: 12, ...clampStyle(2) };

  const wip = firstWord(ev.wipManager) || "";
  const ins = asName(ev.installer) || ""; 
  const time = ev.startTime || "";
  const own = firstWord(ev.caseOwner) || "";
  
  const line2 = [wip, ins, time, own].filter(Boolean).join(" | ");

  // --- FIXED: Merge incoming style (width: 100%) ---
  const colorStyle = {
    ...style, // <-- This applies width: 100% from parent
    background: ev.colour || "#3b82f6",
    boxSizing: "border-box", // Ensure padding doesn't break width
  };

  const pillClasses = [
    "event-pill",
    className, 
    ev.isManual ? "event-pill--manual" : ""
  ].filter(Boolean).join(" ");

  const onClick = (e) => {
    // e.stopPropagation(); // Optional: prevent cell click if needed
    const rect = ref.current?.getBoundingClientRect();
    if (rect && onOpenEditor) {
      onOpenEditor(ev, rect);
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