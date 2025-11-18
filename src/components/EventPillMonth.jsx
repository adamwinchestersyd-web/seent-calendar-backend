// src/components/EventPillMonth.jsx
import React from "react";

// Styles specific to the Month View pill
// We use inline styles for layout and CSS classes for theme/colors
const pillStyle = {
  width: "100%",
  height: "100%",
  minHeight: "24px", // Standard height for month bars
  padding: "2px 6px",
  boxSizing: "border-box",
  borderRadius: "4px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  overflow: "hidden",
  whiteSpace: "nowrap",
  fontSize: "12px",
  lineHeight: "1.2",
  color: "#fff",
  position: "relative",
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
};

export default function EventPillMonth({ ev, onOpenEditor }) {
  // Background color from event or default blue
  const bgStyle = {
    background: ev.colour || "#3b82f6",
  };

  // Combine for the main wrapper
  const style = { ...pillStyle, ...bgStyle };

  // Click handler
  const onClick = (e) => {
    e.stopPropagation();
    if (onOpenEditor) {
      const rect = e.currentTarget.getBoundingClientRect();
      // Pass click coordinates to parent
      onOpenEditor(ev, { clientY: rect.top, clientX: rect.left });
    }
  };

  // Construct the label: "09:00 · Job Title" or just "Job Title"
  const timeLabel = ev.startTime ? `${ev.startTime} · ` : "";
  const label = `${timeLabel}${ev.title}`;

  return (
    <div 
      className={`event-pill-month ${ev.isManual ? "event-pill--manual" : ""}`}
      style={style} 
      title={ev.title}
      onClick={onClick}
    >
      {/* Text Content */}
      <div style={{ overflow: "hidden", textOverflow: "ellipsis", fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}