/**
 * Where a reading sits against the window it is drawn beside.
 *
 * The hero prints the score over a 24-month sparkline, and a first-time reader
 * has no way to know whether 33 is low. A weather app answers the same
 * question with a range bar: today's dot inside the week's low and high. This
 * is that answer as a sentence, from the same series the line draws, so the
 * two cannot disagree. It reports rank, not a band the product would have to
 * invent — "bottom quarter since Sep 2024" is a fact about the record, and the
 * window line printed under it says what the readings are.
 */

/** Rounded to the nearest quarter of the window; outside it says so. */
export const describeWindowPosition = (
  value: number,
  window: readonly number[],
  windowLabel: string,
): string | null => {
  const readings = window.filter((entry) => Number.isFinite(entry));
  if (!Number.isFinite(value) || readings.length < 4) return null;

  const min = Math.min(...readings);
  const max = Math.max(...readings);
  if (value < min) return `Below every reading ${windowLabel}`;
  if (value > max) return `Above every reading ${windowLabel}`;

  const below = readings.filter((entry) => entry < value).length;
  const share = below / readings.length;
  if (share < 0.25) return `Bottom quarter ${windowLabel}`;
  if (share < 0.5) return `Lower half ${windowLabel}`;
  if (share < 0.75) return `Upper half ${windowLabel}`;
  return `Top quarter ${windowLabel}`;
};
