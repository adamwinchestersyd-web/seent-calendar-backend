// src/domain/rules.ts
type Mode = "state" | "case";

const stateToClass: Record<string, string> = {
  VIC: "event--blue",
  NSW: "event--green",
  QLD: "event--orange",
  SA:  "event--purple",
  WA:  "event--teal",
  TAS: "event--pink",
};

const stateToColor: Record<string, string> = {
  VIC: "#2e76d0",
  NSW: "#2da36f",
  QLD: "#f39c12",
  SA:  "#7a4bd6",
  WA:  "#149e9a",
  TAS: "#d75aa0",
};

export function applyColorRule(list: any[] = [], mode: Mode = "state") {
  const safe = Array.isArray(list) ? list : [];
  return safe.map((e) => {
    if (mode === "state") {
      const s = e?.state ?? "";
      return {
        ...e,
        colorClass: e?.colorClass ?? stateToClass[s] ?? "event--blue",
        colour:     e?.colour     ?? stateToColor[s] ?? "#2e76d0",
      };
    }
    // mode === "case" → prefer the event’s own colours, fall back to state defaults
    const s = e?.state ?? "";
    return {
      ...e,
      colorClass: e?.colorClass ?? stateToClass[s] ?? "event--blue",
      colour:     e?.colour     ?? stateToColor[s] ?? "#2e76d0",
    };
  });
}
