import type { CalendarEvent } from "../../domain/types";
import type { CalendarDataSource, DateRange } from "../../domain/source";

// --- static seed (moved out of Calendar.jsx) ---
const DEMO_EVENTS: CalendarEvent[] = [
  { id:"JOB4851", title:"Skechers – Northgate TAS Audio", start:"2025-09-08", end:"2025-09-10", startTime:"07:00", caseHours:12, wipManager:"Uditha Green", installer:"Scott Fitzgerald", caseOwner:"Jess Smith", pmNotes:"Audio matrix upgrade; confirm ceiling tile access with centre management.", url:"#", colour:"#2563eb", state:"TAS" },
  { id:"JOB4846", title:"Dashing – Power Supplies", start:"2025-09-09", end:"2025-09-12", startTime:"07:30", caseHours:24, wipManager:"Adam Winchester", installer:"Tod Gold", caseOwner:"Scott Fitzgerald", pmNotes:"Ensure isolated circuit on arrival.", url:"#", colour:"#dc2626", state:"NSW" },
  { id:"JOB4841", title:"Cotton On Mall of Africa RSA – Reinstall LED", start:"2025-09-11", end:"2025-09-14", startTime:"08:00", caseHours:20, wipManager:"Cheyenne Shadanbaz", installer:"Darren Strickland", caseOwner:"Ali Gholami", pmNotes:"Overseas call with SA team for handover.", url:"#", colour:"#16a34a", state:"NSW" },
  { id:"JOB4831", title:"Cotton On Kids – Tauranga NZ", start:"2025-09-15", end:"2025-09-17", startTime:"07:00", caseHours:18, wipManager:"Renee Petale", installer:"Prabash Athukorala", caseOwner:"Paulo Oliveira", pmNotes:"Freight arriving D-1; confirm dock access.", url:"#", colour:"#f59e0b", state:"NSW" },
  { id:"JOB4820", title:"ASICS – Chadstone VIC", start:"2025-09-18", end:"2025-09-18", startTime:"06:30", caseHours:22, wipManager:"Stephanie Ho", installer:"Sachine Santhosh", caseOwner:"Dominic Feik", pmNotes:"New store manager; security induction on day 1.", url:"#", colour:"#8b5cf6", state:"VIC" },
  { id:"JOB4987", title:"Reebok – Chadstone VIC", start:"2025-09-18", end:"2025-09-18", startTime:"06:30", caseHours:22, wipManager:"Stephanie Ho", installer:"Sachine Santhosh", caseOwner:"Dominic Feik", pmNotes:"New store manager; security induction on day 1.", url:"#", colour:"#8b5cf6", state:"TAS" },
  { id:"JOB4986", title:"Nike – Chadstone VIC", start:"2025-09-18", end:"2025-09-18", startTime:"06:30", caseHours:22, wipManager:"Stephanie Ho", installer:"Sachine Santhosh", caseOwner:"Dominic Feik", pmNotes:"New store manager; security induction on day 1.", url:"#", colour:"#8b5cf6", state:"NSW" },
  { id:"JOB4985", title:"Supreme – Chadstone VIC", start:"2025-09-18", end:"2025-09-18", startTime:"06:30", caseHours:22, wipManager:"Stephanie Ho", installer:"Sachine Santhosh", caseOwner:"Dominic Feik", pmNotes:"New store manager; security induction on day 1.", url:"#", colour:"#8b5cf6", state:"QLD" },
  { id:"JOB4790", title:"Strand – Fashion Spree (NSW)", start:"2025-09-22", end:"2025-09-24", startTime:"07:00", caseHours:16, wipManager:"Justine Cole-Sinclair", installer:"Maheshwar Samippandian", caseOwner:"Meryl Tumiwa", pmNotes:"Permit paperwork at dock office; bring photo ID.", url:"#", colour:"#059669", state:"NSW" },
  { id:"JOB4779", title:"Supre – Broadway (NSW) – Oct 8", start:"2025-10-08", end:"2025-10-09", startTime:"07:00", caseHours:10, wipManager:"Paul Harris", installer:"Jon Williamson", caseOwner:"Joe Taverna", pmNotes:"Short overnight swap of lightboxes.", url:"#", colour:"#059669", state:"NSW" },
  { id:"JOB4776", title:"TAF – Nowra Relocation", start:"2025-09-29", end:"2025-10-02", startTime:"07:00", caseHours:28, wipManager:"Darshana Sheth", installer:"Fon Kang-Onta", caseOwner:"Ishan Fernando", pmNotes:"Palette lift access only – no forklifts.", url:"#", colour:"#059669", state:"NSW" },
  { id:"JOB4772", title:"Beachwood Homes – Meridian Replace Screens", start:"2025-09-12", end:"2025-09-15", startTime:"07:00", caseHours:14, wipManager:"Prabash Athukorala", installer:"Renee Petale", caseOwner:"Paulo Oliveira", pmNotes:"Outdoor run — pack weather covers.", url:"#", colour:"#059669", state:"NSW" },
  { id:"JOB4769", title:"ABC Homes – Valley to Lucas Relocation", start:"2025-09-20", end:"2025-09-25", startTime:"07:00", caseHours:30, wipManager:"Manju Shrestha", installer:"Meryl Tumiwa", caseOwner:"Maheshwar Samippandian", pmNotes:"Two teams alternating shifts.", url:"#", colour:"#14b8a6", state:"VIC" },
  { id:"JOB4758", title:"Connor – Fix the Fleet – South Wharf", start:"2025-09-26", end:"2025-09-27", startTime:"07:00", caseHours:8, wipManager:"Stephanie Ho", installer:"Scott Fitzgerald", caseOwner:"Adam Winchester", pmNotes:"Short duration; vehicle signage only.", url:"#", colour:"#8b5cf6", state:"VIC" },
];

// --- demo provider (filters by overlap with range) ---
export const demoDataSource: CalendarDataSource = {
  async listEvents(range: DateRange): Promise<CalendarEvent[]> {
    const { start, end } = range;
    const overlaps = (ev: CalendarEvent) => !(new Date(ev.end + "T00:00:00") < start || new Date(ev.start + "T00:00:00") > end);
    // mimic latency
    await new Promise(r => setTimeout(r, 50));
    return DEMO_EVENTS.filter(overlaps);
  },
};
