import React from "react";
import EventPill from "../components/EventPill";
import {
  addDays,
  startOfMonthGrid,
  endOfMonthGrid,
  segmentEventAcrossRange,
  packLanes,
  to12h,
} from "../app/utils/calendar";

type Props = {
  date: Date;
  events: any[];
  onMove?: (evtId: string, newStart: Date) => void;
  onResize?: (evtId: string, edge: "start" | "end", targetDate: Date) => void;
  onOpenEditor?: (ev: any, anchor: DOMRect) => void;
};

const CELL_MIN_H = 112;
const DATE_PAD = 20;
const GAP = 55;

type WeekRow = {
  week: Date[];
  rowStart: Date;
  rowEnd: Date;
  lanes: any[][];
  laneRefs: React.RefObject<HTMLDivElement>[][];
};

export default function MonthView({ date, events, onMove, onResize, onOpenEditor }: Props) {
  const gridStart = React.useMemo(() => startOfMonthGrid(date), [date]);
  const gridEnd = React.useMemo(() => endOfMonthGrid(date), [date]);
const H_GUTTER = 4;
const V_GUTTER = 2;

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
        .sort((a, b) => a.start.getTime() - b.start.getTime() || b.span - a.span);

      const lanes = packLanes(segs);
      const laneRefs = lanes.map((lane: any[]) => lane.map(() => React.createRef<HTMLDivElement>())) as React.RefObject<HTMLDivElement>[][];

      return { week, rowStart, rowEnd, lanes, laneRefs };
    });
  }, [weeks, events]);

  const [laneHeights, setLaneHeights] = React.useState<number[][]>(() => weeks.map(() => []));
  const [rowHeights, setRowHeights] = React.useState<number[]>(() => weeks.map(() => CELL_MIN_H));

  React.useLayoutEffect(() => {
    const nextLaneHeights = weekData.map(({ laneRefs }) =>
      laneRefs.map((lane) => {
        let maxH = 22;
        for (const r of lane) {
          const el = r.current;
          if (el) {
            const h = Math.ceil(el.getBoundingClientRect().height);
            if (h > maxH) maxH = h;
          }
        }
        return maxH;
      })
    );

    const nextRowHeights = nextLaneHeights.map((laneHs) => {
      const contentHeight = laneHs.reduce((acc, h, i) => acc + (i ? GAP : 0) + h, 0);
      return Math.max(CELL_MIN_H, DATE_PAD + contentHeight + 8);
    });

    if (JSON.stringify(nextLaneHeights) !== JSON.stringify(laneHeights)) {
      setLaneHeights(nextLaneHeights);
    }
    if (JSON.stringify(nextRowHeights) !== JSON.stringify(rowHeights)) {
      setRowHeights(nextRowHeights);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  const laneTops = laneHeights.map((laneHs) => {
    const tops: number[] = [];
    let cur = DATE_PAD;
    laneHs.forEach((h) => { tops.push(cur); cur += h + GAP; });
    return tops;
  });

  const onCellDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  };

  const onCellDrop = (targetDate: Date) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const raw =
      e.dataTransfer?.getData("application/json") ||
      e.dataTransfer?.getData("text/plain") ||
      "";
    try {
      const data = JSON.parse(raw);
      if (onMove) onMove(data.evtId, targetDate);
      else console.log("Dropped event:", data, "->", targetDate.toISOString().slice(0, 10));
    } catch {}
  };

  const onDragStart = (seg: any) => (e: React.DragEvent<HTMLDivElement>) => {
    const payload = JSON.stringify({ segId: seg.id, evtId: seg.evt?.id });
    e.dataTransfer?.setData("application/json", payload);
    e.dataTransfer?.setData("text/plain", payload);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  };
  const onDragEnd = (_e: React.DragEvent<HTMLDivElement>) => {};

  type PendingResize = { segId: string; evtId?: string; edge: "start" | "end" } | null;
  const [pendingResize, setPendingResize] = React.useState<PendingResize>(null);

  const beginQuickResize = (seg: any) => (ev: React.MouseEvent<HTMLDivElement>) => {
    if (!(ev.ctrlKey || ev.detail === 2)) return;
    ev.preventDefault(); ev.stopPropagation();
    const rect = (ev.currentTarget as HTMLDivElement).getBoundingClientRect();
    const edge: "start" | "end" = ev.clientX - rect.left < rect.width / 2 ? "start" : "end";
    setPendingResize({ segId: seg.id, evtId: seg.evt?.id, edge });
  };

  const pickQuickResizeDate =
    (targetDate: Date) => (ev: React.MouseEvent<HTMLDivElement>) => {
      if (!(ev.ctrlKey || ev.detail === 2)) return;
      if (!pendingResize) return;
      ev.preventDefault(); ev.stopPropagation();
      if (onResize) onResize(pendingResize.evtId!, pendingResize.edge, targetDate);
      else console.log("Resize:", pendingResize, "->", targetDate.toISOString().slice(0, 10));
      setPendingResize(null);
    };

  return (
    <div className="calendar-root">
      <div className="calendar-header">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="calendar-header__cell">{d}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {weekData.map((row, rIdx) => (
          <div key={rIdx} className="calendar-row" style={{ ["--cols" as any]: 7 }}>
            {row.week.map((d, i) => (
              <div
                key={i}
                className="calendar-cell"
                style={{ position: "relative", minHeight: rowHeights[rIdx] }}
                onDragOver={onCellDragOver}
                onDrop={onCellDrop(d)}
                onDoubleClick={pickQuickResizeDate(d)}
                onClick={(e) => { if (e.ctrlKey) pickQuickResizeDate(d)(e as any); }}
              >
                <div className="absolute top-2 left-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  {d.getDate()}
                </div>
              </div>
            ))}

            <div className="absolute inset-0 pointer-events-none" style={{ position: "absolute" }}>
              {row.lanes.map((lane, li) =>
                lane.map((seg, bi) => {
                  const e = seg.evt;
                  const isSingleDay = seg.span === 1;
                  const top = laneTops[rIdx][li] ?? DATE_PAD;
                  const left = (seg.offset / 7) * 100;
                  const width = (seg.span / 7) * 100;

                  const tooltip = [
                    `${e.title}${e.caseHours ? ` (${e.caseHours}h)` : ""}${e.startTime ? ` @ ${to12h(e.startTime)}` : ""}`,
                    e.wipManager ? `WIP: ${e.wipManager}` : "",
                    e.installer ? `Installer: ${e.installer}` : "",
                    e.caseOwner ? `Owner: ${e.caseOwner}` : "",
                    e.pmNotes ? `Notes: ${e.pmNotes}` : "",
                  ].filter(Boolean).join("\n");

                  return (
                    <div
                      key={seg.id}
                      ref={row.laneRefs[li][bi]}
                      className="pointer-events-auto"
                      style={{
                            position: "absolute",
                            top,
                            left: `${left}%`,
                            width: `${width}%`,
                            padding: `${V_GUTTER}px ${H_GUTTER}px`,  // 👈 gutters included in measurement
                            boxSizing: "border-box",
                          }}

                      draggable
                      onDragStart={onDragStart(seg)}
                      onDragEnd={onDragEnd}
                      onDoubleClick={beginQuickResize(seg)}
                      onClick={(evt) => {
                        if (evt.ctrlKey) { beginQuickResize(seg)(evt as any); return; }
                        const rect = row.laneRefs[li][bi].current?.getBoundingClientRect();
                        if (rect) onOpenEditor?.(e, rect);
                      }}
                      title={tooltip}
                    >
                      <EventPill
                        ev={e}
                        isMultiDay={!isSingleDay}
                        className={e.colorClass || "event--blue"}
                        style={{ width: "100%" }}
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
