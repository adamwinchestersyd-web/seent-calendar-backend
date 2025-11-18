// CACHE BUST v50 - Fix Week View Popup
import React from "react";
import EventPillWeek from "../components/EventPillWeek.jsx"; // <-- Uses correct component
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
    const measure = () => setW(Math.round(el.getBoundingClientRect().width));
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

  const segs = React.useMemo(
    () =>
      (events || [])
        .filter((e) => {
          const start = new Date(e.start);
          const end = new Date(e.end);
          // Inclusive overlap check
          if (end < weekStart) return false;
          if (start > weekEnd) return false;
          return true;
        })
        .flatMap((e) => segmentEventAcrossRange(e, weekStart, weekEnd))
        .sort((a, b) => a.start.getTime() - b.start.getTime() || b.span - a.span),
    [events, weekStart, weekEnd]
  );

  const H_GUTTER = 4;
  const V_GUTTER = 2;
  const lanes = React.useMemo(() => packLanes(segs), [segs]);
  const laneRefs = React.useMemo(
    () => lanes.map((lane) => lane.map(() => React.createRef<HTMLDivElement>())),
    [lanes.length]
  );

  const [laneHeights, setLaneHeights] = React.useState<number[]>([]);
  const [sectionH, setSectionH] = React.useState(60);
  const rowRef = React.useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;
  const rowWidth = useElementWidth(rowRef);
  const BAR_MIN = 84; 
  const LANE_GAP = 4;
  
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

  // Calculate tops
  const laneTops = React.useMemo(() => {
    const tops: number[] = [];
    let currentTop = 0;
    for (const h of laneHeights) {
        tops.push(currentTop);
        currentTop += h + LANE_GAP;
    }
    return tops;
  }, [laneHeights, LANE_GAP]);

  const onDragStart = (seg: any) => (e: React.DragEvent<HTMLDivElement>) => {
    const payload = JSON.stringify({ segId: seg.id, evtId: seg.evt?.id });
    e.dataTransfer?.setData("application/json", payload);
  };

  return (
    <div className="calendar-root">
      <div className="calendar-header sticky-header blue-header">
        {days.map((d, i) => (
          <div key={i} className="calendar-header__cell">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]} {d.getDate()}
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        <div
          ref={rowRef}
          className="calendar-row"
          style={{ ["--cols" as any]: 7, position: "relative", minHeight: sectionH }}
        >
          {days.map((d, i) => (
            <div key={i} className="calendar-cell" />
          ))}

          {lanes.map((lane, li) =>
            lane.map((seg, bi) => {
              const e = seg.evt;
              const top = laneTops[li] || 0;
              const leftPct = (seg.offset / 7) * 100;
              const widthPct = (Math.max(1, seg.span) / 7) * 100;
              const isSingle = seg.span === 1;
              const tooltip = e.title;

              return (
                <div
                  key={seg.id}
                  ref={laneRefs[li][bi]}
                  style={{
                        position: "absolute",
                        top,
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
                  {/* --- FIXED: Use EventPillWeek and pass onOpenEditor --- */}
                  <EventPillWeek
                    ev={e}
                    isMultiDay={!isSingle}
                    className={e.colorClass || "event--blue"}
                    style={{ width: "100%", ...e.colour ? {["--c"]: e.colour} : {} }}
                    onOpenEditor={onOpenEditor}
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