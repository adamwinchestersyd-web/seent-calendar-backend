// DayView.tsx
// CACHE BUST v51 - HORIZONTAL CARD LAYOUT (Full Drop-in)
import React from "react";
import { links } from "../app/config/links";
import { NoteIcon, ScrewIcon, CrownIcon } from "../app/ui/icons";

type Props = { date: Date; events: any[] };

// Helper to check if two dates are the same calendar day, ignoring time
const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
};

export default function DayView({ date, events }: Props) {
  // Filter events for this specific day
  const visible = events.filter((e) => {
    const eventStart = new Date(e.start);
    const eventEnd = new Date(e.end);

    // CRITICAL FIX: Convert target date to its start-of-day boundary
    const targetStartOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    // And its end-of-day boundary (start of next day)
    const targetEndOfDay = addDays(targetStartOfDay, 1);

    // 1. Check for single-day event match
    if (isSameDay(eventStart, targetStartOfDay)) {
        return true;
    }

    // 2. Check for multi-day span:
    // Event starts before the end of the target day, AND
    // Event ends after the start of the target day.
    // We add 1 day to eventEnd for correct comparison since End Date in CRM usually means the last day *of* the work.
    const eventEndAdjusted = addDays(eventEnd, 1); 
    
    return eventStart < targetEndOfDay && eventEndAdjusted > targetStartOfDay;
  });

  // Helper from calendar utils (needs to be available)
  function addDays(date: Date, days: number): Date {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
  }

  const labelDate =
    date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }) || "";

  return (
    <div className="calendar-root">
      {/* 1. HEADER - Force single column header */}
      <div className="calendar-header" style={{ ["--cols" as any]: 1, display: 'grid' }}>
        <div className="calendar-header__cell">{labelDate}</div>
      </div>

      <div className="calendar-grid">
        {/* 2. GRID ROW - Force single column content */}
        <div className="calendar-row" style={{ ["--cols" as any]: 1, gridTemplateColumns: '1fr' }}>
          <div className="calendar-cell">
            {visible.length === 0 ? (
              <div className="day-empty" style={{ padding: '12px' }}>No events for this day.</div>
            ) : (
              // *** FIXED: Apply Flexbox to content wrapper for horizontal flow and wrapping ***
              <div className="day-cards-wrapper">
                {visible.map((ev: any) => {
                  const crmUrl = ev.caseId 
                    ? `https://crm.zoho.com/crm/org640578001/tab/Cases/${ev.caseId}` 
                    : ev.url || "#";

                  const title =
                    `${ev.title}` +
                    (ev.caseHours ? ` (${ev.caseHours}h)` : "") +
                    (ev.startTime ? ` · ${ev.startTime}` : "");
                  
                  const barColor = ev.colour || "#3b82f6";

                  return (
                    <div key={ev.id} className="day-card">
                      <div
                        className="day-card__bar"
                        style={{ background: barColor }}
                        title={title}
                      >
                        <div className="truncate">{title}</div>
                      </div>

                      <div className="day-card__body">
                        <div className="day-card__people">
                          {ev.wipManager ? (
                            <span className="inline-flex items-center gap-1">
                              <NoteIcon /> {ev.wipManager}
                            </span>
                          ) : null}
                          {ev.installer ? (
                            <span className="inline-flex items-center gap-1">
                              <ScrewIcon /> {ev.installer}
                            </span>
                          ) : null}
                          {ev.caseOwner ? (
                            <span className="inline-flex items-center gap-1">
                              <CrownIcon /> {ev.caseOwner}
                            </span>
                          ) : null}
                        </div>

                        {ev.pmNotes ? (
                          <div className="day-card__notes">{ev.pmNotes}</div>
                        ) : null}

                        <div>
                          <a
                            className="btn-secondary"
                            href={crmUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ 
                              padding: '6px 10px', 
                              borderRadius: '8px',
                              background: '#1f2327', 
                              border: '1px solid var(--grid)', 
                              color: 'var(--text)',
                              textDecoration: 'none',
                              display: 'inline-block'
                            }}
                          >
                            View Record
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}