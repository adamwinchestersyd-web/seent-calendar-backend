// CACHE BUST v27 - Fix Sticky Dates
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

const CELL_MIN_H = 120;
const DATE_HEADER_H = 28;
const EVENT_H = 26;

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
      const rowStart = week[0];
      const rowEnd   = week[6];

      const segs = (events || [])
        .flatMap((e) => segmentEventAcrossRange(e, rowStart, rowEnd))
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
      const contentH = DATE_HEADER_H + (maxLaneIndex * EVENT_H) + 10; 
      return Math.max(CELL_MIN_H, contentH);
    });
  }, [weekData]);

  const onCellDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  };

  const onCellDrop = (targetDate: Date) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer?.getData("application/json") || "";
    try {
      const data = JSON.parse(raw);
      if (onMove) onMove(data.evtId, targetDate);
    } catch {}
  };

  const onDragStart = (seg: any) => (e: React.DragEvent<HTMLDivElement>) => {
    const payload = JSON.stringify({ segId: seg.id, evtId: seg.evt?.id });
    e.dataTransfer?.setData("application/json", payload);
  };

  return (
    <div className="calendar-root">
      <div className="calendar-header sticky-header blue-header">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="calendar-header__cell">{d}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {weekData.map((row, rIdx) => (
          <div key={rIdx} className="calendar-row" style={{ ["--cols" as any]: 7, height: rowHeights[rIdx] }}>
            {row.week.map((d, i) => (
              <div
                key={i}
                className="calendar-cell"
                onDragOver={onCellDragOver}
                onDrop={onCellDrop(d)}
              >
                {/* --- FIXED: Removed inline absolute positioning so sticky CSS works --- */}
                <div className="sticky-date-label blue-date-label">
                  {d.getDate()}
                </div>
              </div>
            ))}

            <div className="absolute inset-0 pointer-events-none">
              {row.lanes.map((lane, laneIdx) =>
                lane.map((seg, segIdx) => {
                  const e = seg.evt;
                  const top = DATE_HEADER_H + (laneIdx * EVENT_H);
                  const left = (seg.offset / 7) * 100;
                  const width = (seg.span / 7) * 100;

                  return (
                    <div
                      key={seg.id}
                      ref={row.laneRefs[laneIdx][segIdx]}
                      className="pointer-events-auto"
                      style={{
                        position: "absolute",
                        top: `${top}px`,
                        left: `${left}%`,
                        width: `${width}%`,
                        height: `${EVENT_H - 4}px`, 
                        padding: "0 4px", 
                        boxSizing: "border-box",
                        zIndex: 10,
                      }}
                      draggable
                      onDragStart={onDragStart(seg)}
                      title={e.title}
                    >
                      <EventPillMonth
                        ev={e}
                        onOpenEditor={onOpenEditor}
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