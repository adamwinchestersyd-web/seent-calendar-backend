// EventPillMonth.jsx
// CACHE BUST v53 - FINAL CLICK FIX (Full Drop-in)
import React from "react";

// Utility: clamp text to N lines using CSS-only
const clampStyle = (lines) => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  WebkitLineClamp: lines,
  wordBreak: "break-word",
});

export default function EventPillMonth({ ev, style, className, onOpenEditor }) {
  // --- 4-Line Layout ---
  // Line 1: Title (Bold)
  // Line 2: Meta (WIP | Installer)
  // Line 3-4: Notes (Italic)
  
  const titleStyle = { 
    fontWeight: 700, 
    fontSize: "12px",
    lineHeight: "1.2",
    marginBottom: "2px",
    ...clampStyle(1) 
  };
  
  const metaStyle = { 
    opacity: 0.9, 
    fontSize: "11px", 
    lineHeight: "1.2",
    marginBottom: "2px",
    ...clampStyle(1) 
  };
  
  const notesStyle = { 
    opacity: 0.8, 
    fontSize: "11px", 
    fontStyle: "italic",
    lineHeight: "1.1",
    ...clampStyle(2) 
  };

  // Safe data extraction
  const safeString = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (val.name) return val.name;
    return String(val);
  };

  const wip = safeString(ev.wipManager);
  const ins = safeString(ev.installer);
  const own = safeString(ev.caseOwner);
  const line2 = [wip, ins, own].filter(Boolean).join(" | ");

  // Container Style: 
  const containerStyle = {
    ...style,
    width: "100%",
    height: "100%",
    background: ev.colour || "#3b82f6",
    color: "#fff",
    padding: "4px 6px",
    borderRadius: "4px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    boxSizing: "border-box",
    overflow: "hidden",
    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
    position: "relative" 
  };

  const onClick = (e) => {
    e.stopPropagation(); // CRITICAL: Prevent hitting the cell/row below
    if (onOpenEditor) {
      const rect = e.currentTarget.getBoundingClientRect();
      // Call the parent handler with the event data and screen position
      onOpenEditor(ev, { clientY: rect.top, clientX: rect.left });
    }
  };

  return (
    <div 
      className={`event-pill-month ${ev.isManual ? "event-pill--manual" : ""}`}
      style={containerStyle}
      title={ev.title}
      onClick={onClick}
    >
      {/* Title */}
      <div style={titleStyle}>
        {ev.title || "Untitled"}
      </div>

      {/* Meta Info */}
      {line2 && <div style={metaStyle}>{line2}</div>}

      {/* Notes */}
      {ev.pmNotes && <div style={notesStyle}>{ev.pmNotes}</div>}
    </div>
  );
}