// CACHE BUST v34 - FINAL STICKY LOGIC
import React from "react";
import EventPillWeek from "../components/EventPillWeek.jsx";
import {
  addDays,
  startOfMonthGrid,
  endOfMonthGrid,
  segmentEventAcrossRange,
  packLanes,
} from "../app/utils/calendar";

type Props = {
  date: Date;
  events: any[];
  onMove?: (evtId: string, newStart: Date) => void;
  onResize?: (evtId: string, edge: "start" | "end", targetDate: Date) => void;
  onOpenEditor?: (ev: any, clickEvent: React.MouseEvent) => void;
};

const CELL_MIN_H = 150; 
const DATE_HEADER_H = 45; // Height of the single header bar in subsequent rows
const EVENT_H = 94; // 90px pill + 4px gap
const V_GUTTER = 2;
const H_GUTTER = 4;

type WeekRow = {
  week: Date[];
  lanes: any[][];
  laneRefs: React.RefObject<HTMLDivElement | null>[][];
};

export default function MonthView({ date, events, onMove, onResize, onOpenEditor }: Props) {
  const gridStart = React.useMemo(() => startOfMonthGrid(date), [date]);
  
  const weeks = React.useMemo(() => {
    const out: Date[][] = [];
    let cur = new Date(gridStart);
    for (let r = 0; r < 6; r++) {
      const w: Date[] = [];
      for (let c = 0; c < 7; c++) {
        w.push(new Date(cur));
        cur = addDays(cur, 1);
      }
      out.push(w);
    }
    return out;
  }, [gridStart]);

  const weekData = React.useMemo<WeekRow[]>(() => {
    return weeks.map((week) => {
      const segs = (events || [])
        .flatMap((e) => segmentEventAcrossRange(e, week[0], week[6]))
        .sort((a, b) => {
            const startDiff = a.start.getTime() - b.start.getTime();
            if (startDiff !== 0) return startDiff;
            return b.span - a.span;
        });

      const lanes = packLanes(segs);
      const laneRefs = lanes.map((lane: any[]) => 
        lane.map(() => React.createRef<HTMLDivElement | null>())
      );

      return { week, lanes, laneRefs };
    });
  }, [weeks, events]);

  const rowHeights = React.useMemo(() => {
    return weekData.map((data) => {
      const maxLaneIndex = data.lanes.length;
      // Height = Date Bar Height + (Events * Height) + 10px bottom spacing
      const contentH = DATE_HEADER_H + (maxLaneIndex * EVENT_H) + 10; 
      return Math.max(CELL_MIN_H, contentH);
    });
  }, [weekData]);

  const onDragStart = (seg: any) => (e: React.DragEvent<HTMLDivElement>) => {
    const payload = JSON.stringify({ segId: seg.id, evtId: seg.evt?.id });
    e.dataTransfer?.setData("application/json", payload);
  };

  return (
    <div className="calendar-root">
      {/* 1. MAIN HEADER (Day Names ONLY - Sticks to viewport top) */}
      <div className="calendar-header sticky-header blue-header">
        {weeks[0].map((d, i) => (
          <div key={i} className="calendar-header__cell">
            <div className="header-content">
              <div className="header-day-name">
                {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][i]}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        {weekData.map((row, rIdx) => (
          <div key={rIdx} className="calendar-row" style={{ ["--cols" as any]: 7, height: rowHeights[rIdx] }}>
            {row.week.map((d, i) => (
              <div
                key={i}
                className="calendar-cell"
              >
                {/* 2. DATE NUMBER - Simple Non-Sticky Element (FIXED) */}
                <div className="monthview-date-num-in-cell">
                    {d.getDate()}
                </div>
                
                {/* 3. SPACER (Removed) */}

              </div>
            ))}

            <div className="absolute inset-0 pointer-events-none">
              {row.lanes.map((lane, laneIdx) =>
                lane.map((seg, bi) => {
                  const e = seg.evt;
                  
                  // Position events below the date bar (starts after DATE_HEADER_H)
                  // DATE_HEADER_H is used for all rows to ensure gap from the top of the cell
                  const top = DATE_HEADER_H + (laneIdx * EVENT_H);
                  const left = (seg.offset / 7) * 100;
                  const width = (seg.span / 7) * 100;

                  return (
                    <div
                      key={seg.id}
                      ref={row.laneRefs[laneIdx][bi]}
                      className="pointer-events-auto"
                      style={{
                        position: "absolute",
                        top: `${top}px`,
                        left: `${left}%`,
                        width: `${width}%`,
                        height: `${EVENT_H - 4}px`, 
                        padding: `${V_GUTTER}px ${H_GUTTER}px`,
                        boxSizing: "border-box",
                        zIndex: 10,
                      }}
                      draggable
                      onDragStart={onDragStart(seg)}
                      title={e.title}
                    >
                      <EventPillWeek
                        ev={e}
                        isMultiDay={!seg.span}
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
        ))}
      </div>
    </div>
  );
}