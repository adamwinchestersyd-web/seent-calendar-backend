// EventPillMonth.jsx
// CACHE BUST v54 - FINAL CLICK FIX (Simplified DOM)
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
  // ... (safeString helper remains)
  const safeString = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (val.name) return val.name;
    return String(val);
  };

  // ... (wip, ins, own, line2 calculations remain)
  const wip = safeString(ev.wipManager);
  const ins = safeString(ev.installer);
  const own = safeString(ev.caseOwner);
  const line2 = [wip, ins, own].filter(Boolean).join(" | ");

  // ... (style definitions remain)
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
    e.nativeEvent.stopImmediatePropagation(); // ADDED: Stop native event immediately
    if (onOpenEditor) {
      const rect = e.currentTarget.getBoundingClientRect();
      onOpenEditor(ev, { clientY: rect.top, clientX: rect.left });
    }
  };

  return (
    <div 
      className={`event-pill-month ${ev.isManual ? "event-pill--manual" : ""}`}
      style={containerStyle}
      title={ev.title}
      onClick={onClick}
      // ADDED: Force z-index high, although pointer-events:auto should be enough
      data-testid="event-pill" 
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