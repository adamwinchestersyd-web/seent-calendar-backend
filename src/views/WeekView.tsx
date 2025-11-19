// WeekView.tsx
// CACHE BUST v59 - NaN DEFENSE ONLY (Full Drop-in)
import React from "react";
import EventPillWeek from "../components/EventPillWeek.jsx"; 
import {
  addDays,
  startOfWeek,
  endOfWeek,
  segmentEventAcrossRange,
  packLanes,
  to12h,
} from "../app/utils/calendar";

type Props = {
  date: Date;
  events: any[];
  onOpenEditor?: (ev: any, clickEvent: React.MouseEvent) => void;
};

function useElementWidth(ref: React.RefObject<HTMLDivElement>) {
  const [w, setW] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const next = Math.round(el.getBoundingClientRect().width);
      setW((prev) => (prev === next ? prev : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref]);
  return w;
}

export default function WeekView({ date, events, onOpenEditor }: Props) {
  const weekStart = startOfWeek(date); 
  const weekEnd = endOfWeek(weekStart); 
  const days = [...Array(7)].map((_, i) => addDays(weekStart, i));

  const nextWeekStart = addDays(weekStart, 7);

  const segs = React.useMemo(
    () =>
      (events || [])
        .filter((e) => {
          const start = new Date(e.start);
          const end = new Date(e.end);
          if (end < weekStart) return false;
          if (start >= nextWeekStart) return false;
          return true;
        })
        .flatMap((e) => segmentEventAcrossRange(e, weekStart, weekEnd))
        .sort((a, b) => a.start.getTime() - b.start.getTime() || b.span - a.span),
    [events, weekStart, weekEnd, nextWeekStart]
  );

  const H_GUTTER = 4;
  const V_GUTTER = 2;
  const LANE_GAP = 4;
  const BAR_MIN = 84; 
  
  const lanes = React.useMemo(() => packLanes(segs), [segs]);
  const laneRefs = React.useMemo(
    () => lanes.map((lane) => lane.map(() => React.createRef<HTMLDivElement>())),
    [lanes.length]
  );

  const [laneHeights, setLaneHeights] = React.useState<number[]>([]);
  const [sectionH, setSectionH] = React.useState(60);
  const rowRef = React.useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const rowWidth = useElementWidth(rowRef);
  
  
  React.useLayoutEffect(() => {
    if (!rowWidth) return;
    const raf = requestAnimationFrame(() => {
      const nextLaneHeights = lanes.map((lane, li) => {
        let maxH = BAR_MIN;
        lane.forEach((_, bi) => {
          const el = laneRefs[li][bi]?.current;
          if (el) {
            const pillEl = el.querySelector('.event-pill') as HTMLDivElement;
            if (pillEl) {
              const h = Math.ceil(pillEl.getBoundingClientRect().height);
              if (h > maxH) maxH = h;
            }
          }
        });
        return maxH;
      });
      const nextSectionH =
        nextLaneHeights.reduce((acc, h, i) => acc + (i ? LANE_GAP : 0) + h, 0) + 12;

      if (JSON.stringify(nextLaneHeights) !== JSON.stringify(laneHeights)) {
        setLaneHeights(nextLaneHeights);
      }
      if (nextSectionH !== sectionH) setSectionH(nextSectionH);
    });
    return () => cancelAnimationFrame(raf);
  }, [rowWidth, lanes, laneRefs, BAR_MIN, LANE_GAP, laneHeights, sectionH]);

  const laneTops = React.useMemo(() => {
    const tops: number[] = [];
    let currentTop = 0;
    for (const h of laneHeights) {
        tops.push(currentTop);
        currentTop += h + LANE_GAP;
    }
    return tops;
  }, [laneHeights, LANE_GAP]);

  const onCellDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  };
  const onCellDrop = (targetDate: Date) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer?.getData("application/json") || "";
    try {
      const data = JSON.parse(raw);
      console.log("Dropped event:", data, "onto:", targetDate.toISOString().slice(0, 10));
    } catch {}
  };

  const onDragStart = (seg: any) => (e: React.DragEvent<HTMLDivElement>) => {
    const payload = JSON.stringify({ segId: seg.id, evtId: seg.evt?.id });
    e.dataTransfer?.setData("application/json", payload);
  };
  const onDragEnd = (_e: React.DragEvent<HTMLDivElement>) => {};

  const [pendingResize, setPendingResize] = React.useState<{
    segId: string; evtId?: string; edge: "start" | "end";
  } | null>(null);

  const beginQuickResize = (seg: any) => (ev: React.MouseEvent<HTMLDivElement>) => {
    if (!(ev.ctrlKey || ev.detail === 2)) return;
    ev.preventDefault(); ev.stopPropagation();
    const rect = (ev.currentTarget as HTMLDivElement).getBoundingClientRect();
    const edge: "start" | "end" = (ev.clientX - rect.left) < rect.width / 2 ? "start" : "end";
    setPendingResize({ segId: seg.id, evtId: seg.evt?.id, edge });
  };
  const pickQuickResizeDate = (targetDate: Date) => (ev: React.MouseEvent<HTMLDivElement>) => {
    if (!(ev.ctrlKey || ev.detail === 2)) return;
    if (!pendingResize) return;
    ev.preventDefault(); ev.stopPropagation();
    setPendingResize(null);
  };

  // --- CRITICAL FIX: REMOVING DEFENSIVE RETURN (allows rendering) ---
  // We rely on 'top = laneTops[li] || 0;' to prevent NaN.

  return (
    <div className="calendar-root">
      {/* 1. TOP STICKY HEADER (Day Names AND Date Numbers combined) */}
      <div 
        className="calendar-header sticky-header blue-header"
        style={{ ["--cols" as any]: 7 }} 
      >
        {days.map((d, i) => (
          <div key={i} className="calendar-header__cell">
            <div className="header-content-combined">
              {/* Day Name */}
              <div className="header-day-name">
                {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][i]}
              </div>
              {/* Date Number */}
              <div className="header-date-num">
                {d.getDate()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        <div
          ref={rowRef}
          className="calendar-row"
          style={{ ["--cols" as any]: 7, position: "relative", minHeight: sectionH }}
        >
          {/* RETAINING THE EMPTY CELL LOOP TO PREVENT REGRESSION (Structural Stability) */}
          {days.map((d, i) => (
            <div
              key={i}
              className="calendar-cell"
              onDragOver={onCellDragOver}
              onDrop={onCellDrop(days[i])}
              onDoubleClick={pickQuickResizeDate(d)}
              onClick={(e) => { if (e.ctrlKey) pickQuickResizeDate(d)(e as any); }}
            />
          ))}

          {lanes.map((lane, li) =>
            lane.map((seg, bi) => {
              const e = seg.evt;
              // CRITICAL FIX: Default top to 0 if laneTops[li] is undefined during early renders
              const top = laneTops[li] || 0; 
              const leftPct = (seg.offset / 7) * 100;
              const widthPct = (Math.max(1, seg.span) / 7) * 100;
              const isSingle = seg.span === 1;

              const tooltip = e.title;

              return (
                <div
                  key={seg.id}
                  ref={laneRefs[li][bi]}
                  className="pointer-events-auto"
                  style={{
                        position: "absolute",
                        top: `${top}px`, // This should now resolve to '0px' if laneTops is not ready
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        padding: `${V_GUTTER}px ${H_GUTTER}px`,
                        boxSizing: "border-box",
                        zIndex: 2,
                      }}
                  draggable
                  onDragStart={onDragStart(seg)}
                  title={tooltip}
                >
                <EventPillWeek
                  ev={e}
                  isMultiDay={!isSingle}
                  className={e.colorClass || "event--blue"}
                  style={{ width: "100%", ...e.colour ? {["--c"]: e.colour} : {} }}
                  onOpenEditor={(ev: any, rect: any) => { 
                     if (rect) onOpenEditor?.(ev, { clientY: rect.top, clientX: rect.left } as any);
                  }}
                />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}