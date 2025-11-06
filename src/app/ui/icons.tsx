import React from "react";

const ICON_STYLE: React.CSSProperties = {
  fontSize: 12, lineHeight: 1, display: "inline-block", width: 12, textAlign: "center",
};

export const NoteIcon  = () => <span style={ICON_STYLE} title="WIP">📝</span>;
export const ScrewIcon = () => <span style={ICON_STYLE} title="Installer">🔧</span>;
export const CrownIcon = () => <span style={ICON_STYLE} title="Owner">👑</span>;
