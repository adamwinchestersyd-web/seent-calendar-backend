// MonthView.tsx
// CACHE BUST v56 - FINAL NaN DEFENSE (Full Drop-in)
import React from "react";
import EventPillMonth from "../components/EventPillMonth.jsx"; 
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
const DATE_HEADER_H = 45; // Height of the combined sticky bar
const EVENT_H = 64; 
const V_GUTTER = 2;
const H_GUTTER = 4;

type WeekRow = {
  week: Date[];
  lanes: any[][];
  laneRefs: React.RefObject<HTMLDivElement | null>[][];
};

export default function MonthView({ date, events, onMove, onResize, onOpenEditor }: Props) {
  const gridStart = React.useMemo(() => startOfMonthGrid(date), [date]);
  
  const weeks: Date[][] = React.useMemo(() => {
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

  const weekData: WeekRow[] = React.useMemo(() => {
    return weeks.map((week: Date[]) => {
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

  const rowHeights: number[] = React.useMemo(() => {
    return weekData.map((data: WeekRow) => {
      const maxLaneIndex = data.lanes.length;
      // Height = Sticky Header Height + (Events * Height) + 10px bottom spacing
      const contentH = DATE_HEADER_H + (maxLaneIndex * EVENT_H) + 10; 
      return Math.max(CELL_MIN_H, contentH);
    });
  }, [weekData]);

  const onDragStart = (seg: any) => (e: React.DragEvent<HTMLDivElement>) => {
    const payload = JSON.stringify({ segId: seg.id, evtId: seg.evt?.id });
    e.dataTransfer?.setData("application/json", payload);
  };

  // --- CRITICAL FIX: Defensive return if heights are missing (NaN prevention) ---
  const allLanes = weekData.flatMap(w => w.lanes).flat();
  if (allLanes.length > 0 && rowHeights.some(h => isNaN(h))) {
      return (
          <div className="calendar-root">
              <div className="p-4">Loading event dimensions...</div>
          </div>
      );
  }
  
  return (
    <div className="calendar-root">
      
      <div className="calendar-grid">
        {weekData.map((row: WeekRow, rIdx: number) => (
          <div 
            key={rIdx} 
            className="calendar-row" 
            style={{ ["--cols" as any]: 7, height: rowHeights[rIdx] }}
          >
            {/* 1. REPEATING FULL HEADER ROW */}
            <div className="calendar-header sticky-header blue-header">
              {row.week.map((d: Date, i: number) => (
                <div key={i} className="calendar-header__cell">
                  {/* The working WeekView header content structure: */}
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

            {/* 2. Standard Grid Cells (for visual vertical lines and click handling) */}
            {/* We keep the empty cell loop for MonthView to maintain visual grid alignment when no events exist */}
            {row.week.map((d: Date, i: number) => (
              <div key={i} className="calendar-cell" />
            ))}
            
            {/* 3. Event Layer */}
            <div className="absolute inset-0 pointer-events-none">
              {row.lanes.map((lane: any[], laneIdx: number) =>
                lane.map((seg, bi) => {
                  const e = seg.evt;
                  
                  // Position events below the header (starts after DATE_HEADER_H)
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
                      <EventPillMonth 
                        ev={e}
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