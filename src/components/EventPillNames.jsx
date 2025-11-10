// src/components/EventPillNames.jsx
import React from "react";

// utility: clamp text to N lines using CSS-only (no JS measuring)
const clampStyle = (lines) => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  WebkitLineClamp: lines,
});

// Define the style for the meta line
const metaStyle  = { opacity: 0.9, fontSize: 12, ...clampStyle(1) };

export default function EventPillNames({ ev }) {
  // --- Meta line: WIP Manager | Installer | Start time | Owner ---
  const wip = ev.wipManager || "";
  const ins = ev.installer || "";
  const time = ev.startTime || "";
  const own = ev.caseOwner || "";
  
  const line2 = [wip, ins, time, own].filter(Boolean).join(" | ");

  if (!line2) {
    return null;
  }

  return (
    <div style={metaStyle}>{line2}</div>
  );
}