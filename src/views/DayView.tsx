// CACHE BUST v38 - Fix DayView Link and Styling
import React from "react";
import { links } from "../app/config/links";
import { NoteIcon, ScrewIcon, CrownIcon } from "../app/ui/icons";

type Props = { date: Date; events: any[] };

export default function DayView({ date, events }: Props) {
  // Filter events for this specific day
  const visible = events.filter((e) => {
    const start = new Date(e.start);
    const end = new Date(e.end);
    // Check if the day falls within the event's range
    return date >= start && date <= end;
  });

  const labelDate =
    date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }) || "";

  return (
    <div className="calendar-root">
      <div className="calendar-header">
        <div className="calendar-header__cell">{labelDate}</div>
      </div>

      <div className="calendar-grid">
        <div className="calendar-row" style={{ ["--cols" as any]: 1 }}>
          <div className="calendar-cell" style={{ padding: '12px' }}>
            {visible.length === 0 ? (
              <div className="day-empty">No events for this day.</div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                {visible.map((ev: any) => {
                  // --- FIX: Use the stable CRM URL structure ---
                  const crmUrl = ev.caseId 
                    ? `https://crm.zoho.com/crm/org640578001/tab/Cases/${ev.caseId}` 
                    : ev.url || "#";
                  // ---

                  const title =
                    `${ev.title}` +
                    (ev.caseHours ? ` (${ev.caseHours}h)` : "") +
                    (ev.startTime ? ` · ${ev.startTime}` : "");
                  
                  // Use manual color or state color
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
                            // --- FIX: Use the correct class for styling ---
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