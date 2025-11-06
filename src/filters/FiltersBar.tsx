import React from "react";

type FiltersBarProps = {
  wipOptions?: string[];
  installerOptions?: string[];
  stateOptions?: string[];
  valueWip?: string;
  valueInstaller?: string;
  valueState?: string;
  onWipChange?: (value: string) => void;
  onInstallerChange?: (value: string) => void;
  onStateChange?: (value: string) => void;
  colourMode?: "state" | "case";
  onColourModeChange?: (mode: "state" | "case") => void;
  onReset?: () => void;
};

export default function FiltersBar({
  // options
  wipOptions = [],
  installerOptions = [],
  stateOptions = [],
  // current values
  valueWip = "",
  valueInstaller = "",
  valueState = "",
  // handlers
  onWipChange,
  onInstallerChange,
  onStateChange,
  // colour mode
  colourMode = "state", // "state" | "case"
  onColourModeChange,
  // reset
  onReset,
}: FiltersBarProps) {
  const row = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    borderBottom: "1px solid var(--border,#2a3140)",
    background: "var(--panel,#0b1220)",
  };

  const label = { fontSize: 12, color: "var(--text-muted,#9aa6b2)" };

  const selectStyle = {
    height: 32,
    minWidth: 160,
    padding: "0 10px",
    borderRadius: 8,
    border: "1px solid var(--border,#2a3140)",
    background: "var(--panel,#0f1723)",
    color: "var(--text,#c7d2fe)",
    fontSize: 13,
  };

  const chip = (active: boolean) => ({
    height: 28,
    padding: "0 10px",
    borderRadius: 999,
    border: "1px solid var(--border,#2a3140)",
    background: active ? "rgba(255,255,255,.10)" : "var(--panel,#0f1723)",
    color: "var(--text,#c7d2fe)",
    fontSize: 12,
    cursor: "pointer",
  });

  const resetBtn = {
    height: 30,
    padding: "0 12px",
    borderRadius: 8,
    border: "1px solid var(--border,#2a3140)",
    background: "rgba(255,255,255,.06)",
    color: "var(--text,#c7d2fe)",
    fontSize: 12,
    cursor: "pointer",
    marginLeft: "auto",
  };

  return (
    <div style={row}>
      {/* WIP */}
      <span style={label}>WIP</span>
      <select
        style={selectStyle}
        value={valueWip}
        onChange={(e) => onWipChange?.(e.target.value)}
      >
        <option value="">All</option>
        {wipOptions.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>

      {/* Installer */}
      <span style={label}>Installer</span>
      <select
        style={selectStyle}
        value={valueInstaller}
        onChange={(e) => onInstallerChange?.(e.target.value)}
      >
        <option value="">All</option>
        {installerOptions.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>

      {/* State */}
      <span style={label}>State</span>
      <select
        style={selectStyle}
        value={valueState}
        onChange={(e) => onStateChange?.(e.target.value)}
      >
        <option value="">All</option>
        {stateOptions.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>

      {/* Colour by */}
      <span style={{ ...label, marginLeft: 8 }}>Colour by</span>
      <button
        type="button"
        style={chip(colourMode === "state")}
        onClick={() => onColourModeChange?.("state")}
      >
        State
      </button>
      <button
        type="button"
        style={chip(colourMode === "case")}
        onClick={() => onColourModeChange?.("case")}
      >
        Case Manager
      </button>

      {/* Reset */}
      <button type="button" style={resetBtn} onClick={() => onReset?.()}>
        Reset
      </button>
    </div>
  );
}
