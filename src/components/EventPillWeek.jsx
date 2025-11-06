import React from "react";

// utility: clamp text to N lines using CSS-only (no JS measuring)
const clampStyle = (lines) => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  WebkitLineClamp: lines,
});

export default function EventPillWeek({ ev }) {
  // decide whether it's multi-day (end after start)
  const isMultiDay = ev && ev.start && ev.end && ev.end !== ev.start;

  // allow more PM notes if multi-day
  const notesLines = isMultiDay ? 6 : 1; // 1 line inside the 3-line total; container enforces height

  // container: max 3 lines height for single-day
  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    width: "100%",
    // colours from event.colour (already mapped on server or by state)
    background: ev.colour || "#3b82f6",
    color: "white",
    borderRadius: 8,
    padding: "6px 8px",
    // ensure max-height ~ 3 lines; line-height ≈ 1.2em → 3 * 1.2em ~= 3.6em
    lineHeight: 1.2,
    maxHeight: isMultiDay ? "none" : "3.6em",
  };

  const titleStyle = { fontWeight: 600, ...clampStyle(1) };
  const metaStyle  = { opacity: 0.9, fontSize: 12, ...clampStyle(1) };
  const notesStyle = { opacity: 0.9, fontSize: 12, ...clampStyle(notesLines) };

  const wip = ev.wipManager || "";
  const ins = ev.installer || "";
  const own = ev.caseOwner || "";
  const line2 = [wip, ins, own].filter(Boolean).join(" | ");

  return (
    <div style={containerStyle} title={ev.title}>
      <div style={titleStyle}>{ev.title}</div>
      {line2 && <div style={metaStyle}>{line2}</div>}
      {ev.pmNotes ? <div style={notesStyle}>{ev.pmNotes}</div> : null}
    </div>
  );
}
