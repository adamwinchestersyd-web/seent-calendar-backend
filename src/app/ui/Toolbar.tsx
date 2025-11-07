import React from "react";
import { startOfWeek, endOfWeek } from "../utils/calendar";

type View = "day" | "week" | "month";

type Props = {
  view: View;
  onViewChange: (v: View) => void;
  date: Date;
  onNav: (dir: -1 | 0 | 1) => void;
  onAddNew: () => void;
  onRefresh?: () => void; // admin action
  onPurge?: () => void;   // admin action
};

const styles = {
  root: (panel = "#0b1220", border = "#2a3140") =>
    ({
      width: "100%",
      background: panel,
      borderBottom: `1px solid ${border}`,
    }) as React.CSSProperties,
  row: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 12,
    flexWrap: "wrap",
  } as React.CSSProperties,
  left: { display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  right: { display: "flex", alignItems: "center", gap: 8 } as React.CSSProperties,
  center: (textMuted = "#9aa6b2") =>
    ({
      flex: 1,
      textAlign: "center",
      color: textMuted,
      fontSize: 14,
    }) as React.CSSProperties,
};

function paletteVars() {
  const root = document.documentElement;
  return {
    border: getComputedStyle(root).getPropertyValue("--border").trim() || "#2a3140",
    bg: getComputedStyle(root).getPropertyValue("--panel").trim() || "#0f1723",
    text: getComputedStyle(root).getPropertyValue("--text").trim() || "#c7d2fe",
    textMuted: getComputedStyle(root).getPropertyValue("--text-muted").trim() || "#9aa6b2",
  };
}

function Btn({
  children,
  onClick,
  title,
  active = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
}) {
  const { border, bg, text } = paletteVars();

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 32,
    padding: "0 12px",
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: active ? "rgba(255,255,255,0.08)" : bg,
    color: text,
    fontSize: 14,
    lineHeight: "16px",
    cursor: "pointer",
    userSelect: "none",
  };

  return (
    <button type="button" title={title} style={base} onClick={onClick}>
      {children}
    </button>
  );
}

const fmtAU = new Intl.DateTimeFormat("en-AU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default function Toolbar({
  view,
  onViewChange,
  date,
  onNav,
  onAddNew,
  onRefresh,
  onPurge,
}: Props) {
  const root = document.documentElement;
  const panel = getComputedStyle(root).getPropertyValue("--panel").trim() || "#0b1220";
  const { textMuted, border } = paletteVars();

  const rootStyles = styles.root(panel, border);
  const centerStyles = styles.center(textMuted);

  const label =
    view === "month"
      ? date.toLocaleString("en-AU", { month: "long", year: "numeric" })
      : `${fmtAU.format(startOfWeek(date))} – ${fmtAU.format(endOfWeek(date))}`;

  return (
    <div style={rootStyles}>
      <div style={styles.row}>
        {/* Left: nav */}
        <div style={styles.left}>
          <Btn title="Previous" onClick={() => onNav(-1)}>◀</Btn>
          <Btn title="Today" onClick={() => onNav(0)} active>Today</Btn>
          <Btn title="Next" onClick={() => onNav(1)}>▶</Btn>
        </div>

        {/* Center: range label */}
        <div style={centerStyles}>{label}</div>

        {/* Right: actions + view toggles */}
        <div style={styles.right}>
          
          {/* --- REFRESH BUTTON RE-ADDED --- */}
          {onRefresh && <Btn title="Refresh from Zoho" onClick={onRefresh}>Refresh</Btn>}
          
          <Btn title="Add New Manual Entry" onClick={onAddNew}>Add New</Btn>

          <Btn active={view === "day"} onClick={() => onViewChange("day")}>Day</Btn>
          <Btn active={view === "week"} onClick={() => onViewChange("week")}>Week</Btn>
          <Btn active={view === "month"} onClick={() => onViewChange("month")}>Month</Btn>
        </div>
      </div>
    </div>
  );
}