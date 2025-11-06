import type { CalendarEvent } from "./types";

export type FilterState = {
  wip?: string;
  installer?: string;
  state?: string;
};

export function applyFilters(events: CalendarEvent[], f: FilterState) {
  return events.filter(e => {
    if (f.wip && e.wipManager !== f.wip) return false;
    if (f.installer && e.installer !== f.installer) return false;
    if (f.state && e.state !== f.state) return false;
    return true;
  });
}
