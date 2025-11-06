export type CalendarEvent = {
  id: string;
  title: string;
  start: string;   // YYYY-MM-DD
  end: string;     // YYYY-MM-DD
  startTime?: string; // HH:mm
  caseHours?: number;
  wipManager?: string;
  installer?: string;
  caseOwner?: string;
  pmNotes?: string;
  url?: string;
  state?: string;
  colour?: string;
  colorClass?: string;
};
