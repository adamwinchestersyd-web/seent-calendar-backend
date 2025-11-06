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
  onOpenEditor?: (ev: any, anchor: DOMRect) => void;
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

  const segs = React.useMemo(
    () =>
      (events || [])
        .filter((e) => !(new Date(e.end) < weekStart || new Date(e.start) > weekEnd))
        .flatMap((e) => segmentEventAcrossRange(e, weekStart, weekEnd))
        .sort((a, b) => a.start.getTime() - b.start.getTime() || b.span - a.span),
    [events, weekStart, weekEnd]
  );
// at top of WeekView.tsx, near other consts
const H_GUTTER = 4;   // left/right gap inside each cell
const V_GUTTER = 2;   // top/bottom gap around each pill

  const lanes = React.useMemo(() => packLanes(segs), [segs]);

  const singleDayCounts = React.useMemo(() => {
    const c = Array(7).fill(0);
    segs.forEach((s) => { if (s.span === 1) c[s.offset]++; });
    return c;
  }, [segs]);

  const LANE_GAP = 4;
  const BAR_MIN = 40;

  const laneRefs = React.useMemo(
    () => lanes.map((lane) => lane.map(() => React.createRef<HTMLDivElement>())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lanes.length]
  );

  const [laneHeights, setLaneHeights] = React.useState<number[]>(
    () => lanes.map(() => BAR_MIN)
  );
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
            const h = Math.ceil(el.getBoundingClientRect().height);
            if (h > maxH) maxH = h;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowWidth, lanes.length]);

  const laneTops: number[] = [];
  laneHeights.reduce((acc, h, i) => {
    laneTops[i] = acc;
    return acc + h + LANE_GAP;
  }, 0);

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
      console.log("Dropped event:", data, "onto:", targetDate.toISOString().slice(0, 10));
    } catch {}
  };

  const onDragStart = (seg: any) => (e: React.DragEvent<HTMLDivElement>) => {
    const payload = JSON.stringify({ segId: seg.id, evtId: seg.evt?.id });
    e.dataTransfer?.setData("application/json", payload);
    e.dataTransfer?.setData("text/plain", payload);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
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
    console.log("Resize (week):", pendingResize, "->", targetDate.toISOString().slice(0,10));
    setPendingResize(null);
  };

  return (
    <div className="calendar-root">
      <div className="calendar-header">
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
              const top = laneTops[li] ?? 0;
              const leftPct = (seg.offset / 7) * 100;
              const widthPct = (Math.max(1, seg.span) / 7) * 100;

              const isSingle = seg.span === 1;

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
                  ref={laneRefs[li][bi]}
                  style={{
                        position: "absolute",
                        top,
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        padding: `${V_GUTTER}px ${H_GUTTER}px`,  // 👈 gutters counted in height
                        boxSizing: "border-box",                // ensure padding reduces inner width
                        pointerEvents: "auto",
                        zIndex: 2,
                      }}

                  draggable
                  onDragStart={onDragStart(seg)}
                  onDragEnd={onDragEnd}
                  onDoubleClick={beginQuickResize(seg)}
                  onClick={(evt) => {
                    if (evt.ctrlKey) { beginQuickResize(seg)(evt as any); return; }
                    const rect = laneRefs[li][bi].current?.getBoundingClientRect();
                    if (rect) onOpenEditor?.(e, rect);
                  }}
                  title={tooltip}
                >
                <EventPillWeek ev={e} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
