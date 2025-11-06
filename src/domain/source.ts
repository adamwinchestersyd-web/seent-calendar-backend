import type { CalendarEvent } from "./types";

export type DateRange = { start: Date; end: Date };

export interface CalendarDataSource {
  /** Return events that overlap the range (inclusive). */
  listEvents(range: DateRange): Promise<CalendarEvent[]>;
}
