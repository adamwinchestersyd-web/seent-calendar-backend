import React from "react";
import { links } from "../app/config/links";
import { toDate } from "../app/utils/calendar";
import { NoteIcon, ScrewIcon, CrownIcon } from "../app/ui/icons";

type Props = { date: Date; events: any[] };

export default function DayView({ date, events }: Props) {
  const visible = events.filter(
    (e) => !(toDate(e.end) < date || toDate(e.start) > date)
  );

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
          <div className="calendar-cell p-3">
            {visible.length === 0 ? (
              <div className="day-empty">No events for this day.</div>
            ) : (
              <div className="space-y-3">
                {visible.map((ev: any) => {
                  const href = ev.caseId ? links.caseUrl(ev.caseId) : ev.url || "#";
                  const title =
                    `${ev.title}` +
                    (ev.caseHours ? ` (${ev.caseHours}h)` : "") +
                    (ev.startTime ? ` · ${ev.startTime}` : "");

                  return (
                    <div key={ev.id} className="day-card">
                      <div
                        className="day-card__bar"
                        style={{ ["--c" as any]: ev.colour }}
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
                            href={href}
                            target="_blank"
                            rel="noreferrer"
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
