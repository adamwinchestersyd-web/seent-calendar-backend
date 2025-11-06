import { useEffect, useState } from "react";
import type { ColourMode } from "../../domain/rules";
import { applyColorRule } from "../../domain/rules";
import { applyFilters, type FilterState } from "../../domain/filters";
import type { CalendarEvent } from "../../domain/types";
import type { CalendarDataSource } from "../../domain/source";
import { startOfWeek, endOfWeek } from "../utils/calendar";

type View = "day" | "week" | "month";

function monthRange(d: Date) {
  const start = startOfWeek(new Date(d.getFullYear(), d.getMonth(), 1));
  const end   = endOfWeek(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  return { start, end };
}

function weekRange(d: Date) {
  return { start: startOfWeek(d), end: endOfWeek(d) };
}

export function useEvents(
  source: CalendarDataSource,
  date: Date,
  view: View,
  colourMode: ColourMode,
  filters: FilterState
) {
  const [raw, setRaw] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const range = view === "month" ? monthRange(date) : weekRange(date);
    setLoading(true);
    source.listEvents(range).then((rows) => {
      setRaw(rows);
      setLoading(false);
    });
  }, [source, date, view]);

  const coloured = applyColorRule(raw, colourMode);
  const filtered = applyFilters(coloured, filters);

  return { events: filtered, loading };
}