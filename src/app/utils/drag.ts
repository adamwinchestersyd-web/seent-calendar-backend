// src/app/utils/drag.ts
export type DragKind = "move" | "resize-start" | "resize-end";

export type DragPayload = {
  id: string | number;
  originalStart: Date;
  originalEnd: Date; // inclusive end (end-of-day) or exclusive—your code can normalise
  kind: DragKind;
};

export type DragState = {
  active: boolean;
  kind: DragKind | null;
  startClientX: number;
  colWidth: number;
  deltaCols: number;
};

export function daysBetween(a: Date, b: Date) {
  const ms = normalizeDate(b).getTime() - normalizeDate(a).getTime();
  return Math.round(ms / 86400000);
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function normalizeDate(d: Date) {
  // normalise to local midnight so rounding works consistently
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function clampDate(d: Date, min?: Date, max?: Date) {
  const t = d.getTime();
  if (min && t < min.getTime()) return new Date(min);
  if (max && t > max.getTime()) return new Date(max);
  return d;
}

export function startDrag(
  ev: PointerEvent | MouseEvent | TouchEvent,
  kind: DragKind,
  gridRect: DOMRect,
  columns = 7
): DragState {
  const clientX = getClientX(ev);
  const colWidth = gridRect.width / columns;
  return {
    active: true,
    kind,
    startClientX: clientX,
    colWidth,
    deltaCols: 0,
  };
}

export function updateDrag(state: DragState, ev: PointerEvent | MouseEvent | TouchEvent): DragState {
  if (!state.active) return state;
  const clientX = getClientX(ev);
  const dx = clientX - state.startClientX;
  const deltaCols = Math.round(dx / state.colWidth);
  return { ...state, deltaCols };
}

export function endDrag(state: DragState): DragState {
  return { ...state, active: false, kind: null, deltaCols: 0 };
}

export function applyDelta(
  payload: DragPayload,
  deltaCols: number
): { nextStart: Date; nextEnd: Date } {
  const { kind, originalStart, originalEnd } = payload;

  if (kind === "move") {
    return {
      nextStart: addDays(originalStart, deltaCols),
      nextEnd: addDays(originalEnd, deltaCols),
    };
  }
  if (kind === "resize-start") {
    const nextStart = addDays(originalStart, deltaCols);
    // prevent inverted ranges (keep at least 1 day)
    const minStart = originalEnd; // inclusive model: start <= end
    return {
      nextStart: clampDate(nextStart, undefined, minStart),
      nextEnd: originalEnd,
    };
  }
  // resize-end
  const nextEnd = addDays(originalEnd, deltaCols);
  const minEnd = originalStart; // inclusive model
  return {
    nextStart: originalStart,
    nextEnd: clampDate(nextEnd, minEnd, undefined),
  };
}

function getClientX(ev: any): number {
  if (ev.touches && ev.touches[0]) return ev.touches[0].clientX;
  if (ev.changedTouches && ev.changedTouches[0]) return ev.changedTouches[0].clientX;
  return ev.clientX;
}
