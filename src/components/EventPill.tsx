import React from "react";

const container: React.CSSProperties = {
  color: "white",
  borderRadius: 8,
  padding: "6px 8px",
  lineHeight: 1.25,
  width: "100%",              // 👈 fill wrapper
  // no margins here; wrapper provides separation
  // ...cssVars, // Removed because cssVars is not defined here
  // ...props.style, // Removed because props is not defined here
};

export type EventItem = {
  id: string;
  title: string;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  caseUrl?: string;
  colour?: string;       // server/state-derived colour (used as --c)
  wipManager?: string;
  installer?: string;
  caseOwner?: string;
  pmNotes?: string;
  [key: string]: any;
};

type BaseProps = {
  className?: string;
  style?: React.CSSProperties; // may include ["--c" as any]
  wrapLines?: number;          // legacy
  isMultiDay?: boolean;
};

// Mode A: data-driven (Week/Month)
type DataMode = BaseProps & {
  ev: EventItem;
  onOpenEditor?: (ev: EventItem, anchor: DOMRect) => void;
};

// Mode B: presentational fallback (lists etc.)
type PresentationalMode = BaseProps & { label: string };

type Props = DataMode | PresentationalMode;

// line-clamp helper
const clamp = (lines: number): React.CSSProperties => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical" as any,
  overflow: "hidden",
  WebkitLineClamp: lines as any,
});

// name shortener: "First Last" -> "First L."
function shortName(s?: string) {
  if (!s) return "";
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return "";
  const parts = t.split(" ");
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export default function EventPill(props: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isData = (props as any).ev !== undefined;

  // ---- shared container styles ----
  // IMPORTANT: do NOT set background here; let CSS classes / --c drive colour.
  const cssVars: React.CSSProperties =
    isData && (props as DataMode).ev.colour
      ? ({ ["--c" as any]: (props as DataMode).ev.colour } as any)
      : {};

  const container: React.CSSProperties = {
    color: "white",
    borderRadius: 8,
    padding: "6px 8px",
    lineHeight: 1.2,
    ...cssVars,
    ...props.style, // allow callers to override/add vars
  };

  // ---- presentational (fallback) ----
  if (!isData) {
    return (
      <div
        ref={ref}
        className={`event event-pill ${props.className ?? ""}`}
        style={container}
        title={(props as PresentationalMode).label}
      >
        <div className="event__fill" />
        <div className="event__label">
          <span className="event__title">{(props as PresentationalMode).label}</span>
        </div>
      </div>
    );
  }

  // ---- data-driven ----
  const ev = (props as DataMode).ev;
  const onClick = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) (props as DataMode).onOpenEditor?.(ev, r);
  };

  // People line: WIP · Owner · Installer (short names)
  const people = [shortName(ev.wipManager), shortName(ev.caseOwner), shortName(ev.installer)]
    .filter(Boolean)
    .join(" · ");

 return (
  <div
    ref={ref}
    className={`event event-pill ${props.className ?? ""}`}
    style={container}
    onClick={onClick}
    title={[
      ev.title,
      people,
      ev.pmNotes ? `Notes: ${ev.pmNotes}` : "",
    ]
      .filter(Boolean)
      .join("\n")}
  >
    <div className="event__fill" />
    <div className="event__label">
      <span className="event__title">{ev.title ?? ""}</span>
      {people && <div className="event__people">{people}</div>}
      {ev.pmNotes && <div className="event__notes">{ev.pmNotes}</div>}
    </div>
  </div>
);
}
