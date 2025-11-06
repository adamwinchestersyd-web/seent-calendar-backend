export const uniqSorted = (arr: (string|undefined|null)[]) =>
  [...new Set(arr.filter(Boolean) as string[])].sort((a,b)=>a.localeCompare(b));

export const clamp = (s = "", n = 160) =>
  s && s.length > n ? s.slice(0, n - 1) + "…" : s;

export const to12h = (hhmm = "07:00") => {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  const hour = ((h + 11) % 12) + 1;
  return `${hour}:${m.toString().padStart(2,"0")}${ampm}`;
};
