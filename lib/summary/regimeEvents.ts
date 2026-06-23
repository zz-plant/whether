export type RegimeEvent = {
  year: number;
  month: number;
  label: string;
};

const EVENTS: RegimeEvent[] = [
  { year: 2013, month: 6, label: "Taper Tantrum" },
  { year: 2019, month: 8, label: "Curve Inversion" },
  { year: 2020, month: 3, label: "COVID Crash" },
  { year: 2021, month: 4, label: "Inflation Surge" },
  { year: 2023, month: 3, label: "SVB Collapse" },
];

export const getRegimeEvents = (): RegimeEvent[] => EVENTS;

export type EventMatch = {
  event: RegimeEvent;
  monthsDistance: number;
};

export const findNearestEvent = (
  year: number,
  month: number,
  maxDistance = 3,
): EventMatch | null => {
  let nearest: EventMatch | null = null;
  for (const event of EVENTS) {
    const distance = Math.abs((year - event.year) * 12 + (month - event.month));
    if (distance <= maxDistance && (!nearest || distance < nearest.monthsDistance)) {
      nearest = { event, monthsDistance: distance };
    }
  }
  return nearest;
};

export const findEventAt = (year: number, month: number): RegimeEvent | null =>
  EVENTS.find((e) => e.year === year && e.month === month) ?? null;
