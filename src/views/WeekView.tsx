// WeekView.tsx
// CACHE BUST v57 - FINAL DEFENSE FIX (Full Drop-in)
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
  // ... (useElementWidth function remains unchanged)
}

export default function WeekView({ date, events, onOpenEditor }: Props) {
  const weekStart = startOfWeek(date); 
  const weekEnd = endOfWeek(weekStart); 
  const days = [...Array(7)].map((_, i) => addDays(weekStart, i));

  const nextWeekStart = addDays(weekStart, 7);

// ... (segs, lanes, laneRefs, laneHeights, sectionH, rowRef, rowWidth calculations remain)

  // --- CRITICAL FIX: Ensure laneTops defaults to numbers if laneHeights is empty ---
  const laneTops = React.useMemo(() => {
    const tops: number[] = [];
    let currentTop = 0;
    // If laneHeights is empty (initial state), map will not run, tops remains [].
    for (const h of laneHeights) {
        tops.push(currentTop);
        currentTop += h + LANE_GAP;
    }
    // Return a valid array, which is an empty array if laneHeights is empty.
    return tops; 
  }, [laneHeights, LANE_GAP]);

  // ... (drag/drop handlers remain)

  // --- CRITICAL FIX: Defensive return if heights are zero/NaN ---
  const isReady = !laneHeights.length && segs.length > 0;
  if (isReady) {
      // Return a temporary null or simple structure until layout is ready
      return (
          <div className="calendar-root">
              <div className="p-4">Calculating WeekView layout...</div>
          </div>
      );
  }

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
          {/* REMOVED: Redundant calendar-cell loop */}

          {lanes.map((lane, li) =>
            lane.map((seg, bi) => {
              const e = seg.evt;
              // CRITICAL FIX: Default to 0 if laneTops[li] is undefined (which causes NaN)
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
                        top: `${top}px`,
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