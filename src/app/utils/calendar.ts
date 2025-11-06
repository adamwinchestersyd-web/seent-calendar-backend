// ---- date helpers ----
export const toDate = (s: string) => new Date(s + "T00:00:00");
export const addDays = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const fmtKey = (d: Date) => d.toISOString().slice(0, 10);

export const startOfWeek = (d: Date, weekStartsOn = 1) => {
  const day = d.getDay();
  const diff = (day === 0 ? 7 : day) - weekStartsOn;
  return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -diff);
};
export const endOfWeek = (d: Date) => addDays(startOfWeek(d), 6);

export const startOfMonthGrid = (d: Date) =>
  startOfWeek(new Date(d.getFullYear(), d.getMonth(), 1));
export const endOfMonthGrid = (d: Date) =>
  endOfWeek(new Date(d.getFullYear(), d.getMonth() + 1, 0));

// ---- segment + layout ----
export type Seg = {
  id: string;
  evt: any;
  start: Date;
  end: Date;
  span: number;   // days inclusive
  offset: number; // days from row start
};

export function segmentEventAcrossRange(
  evt: any,
  rangeStart: Date,
  rangeEnd: Date
): Seg[] {
  const s = toDate(evt.start);
  const e = toDate(evt.end);
  const start = s < rangeStart ? rangeStart : s;
  const end = e > rangeEnd ? rangeEnd : e;
  if (end < rangeStart || start > rangeEnd) return [];

  const segs: Seg[] = [];
  let cur = startOfWeek(start);
  while (cur <= end) {
    const rowStart = cur;
    const rowEnd = endOfWeek(cur);
    const segStart = start > rowStart ? start : rowStart;
    const segEnd = end < rowEnd ? end : rowEnd;
    segs.push({
      id: `${evt.id}-${fmtKey(segStart)}`,
      evt,
      start: segStart,
      end: segEnd,
      span: Math.round((segEnd.getTime() - segStart.getTime()) / 86400000) + 1,
      offset: Math.round((segStart.getTime() - rowStart.getTime()) / 86400000),
    });
    cur = addDays(cur, 7);
  }
  return segs;
}

export function packLanes(segments: Seg[]) {
  const lanes: Seg[][] = [];
  for (const seg of segments) {
    let placed = false;
    for (const lane of lanes) {
      const last = lane[lane.length - 1];
      if (fmtKey(addDays(last.end, 0)) < fmtKey(seg.start)) {
        lane.push(seg);
        placed = true;
        break;
      }
    }
    if (!placed) lanes.push([seg]);
  }
  return lanes;
}

// ---- display niceties ----
// Accepts "7", "7am", "7:30", "07:30", "7.30", "0730", "19:15", "7:30 AM", etc.
// Returns "7:00am", "11:30am", ... or "" if it can't parse cleanly.
export const to12h = (raw?: unknown): string => {
  if (raw == null) return "";
  const s = String(raw).trim().toLowerCase();

  // Pattern 1: "7", "7am", "7:30", "7.30", "07:30", "7:30am"
  let m = s.match(/^(\d{1,2})(?::|\.|h)?(\d{2})?\s*(am|pm)?$/i);
  if (!m) {
    // Pattern 2: "0730", "1930"
    m = s.match(/^(\d{2})(\d{2})$/);
    if (!m) return "";
  }

  let hour = parseInt(m[1], 10);
  let minute = m[2] != null ? parseInt(m[2], 10) : 0;
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";

  const meridiem = (m[3] || "").toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;

  // clamp
  hour = Math.max(0, Math.min(23, hour));
  minute = Math.max(0, Math.min(59, minute));

  const h12 = ((hour + 11) % 12) + 1;
  const ap = hour < 12 ? "am" : "pm";
  return `${h12}:${String(minute).padStart(2, "0")}${ap}`;
};
