import type { ReactNode } from "react";

/** A date the text prints without its year ("Nov 9"), and the ISO date it names. */
export type KnownDate = { label: string; iso: string };

const MONTH_NUMBER: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/* "Nov 16, 2026" and "Sep 2022", with the month short or in full. A year is required: a
   month and day alone ("Nov 9") is a date only the caller can place, and comes in `dates`. */
const DATED =
  "(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?) (?:(\\d{1,2}), )?(\\d{4})(?!\\d)";

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Splits printed text into its words and its dates, each date as the ISO value a
 * `<time dateTime>` carries: "2026-11-16" for "Nov 16, 2026", "2022-09" for "Sep 2022",
 * and the caller's ISO for a yearless label it names. The text itself is unchanged.
 */
const splitDates = (text: string, dates: readonly KnownDate[] = []): ({ text: string } | { text: string; iso: string })[] => {
  const known = [...dates].filter((date) => date.label !== "").sort((left, right) => right.label.length - left.label.length);
  const pattern = new RegExp(
    [`\\b${DATED}`, ...(known.length ? [`\\b(${known.map((date) => escape(date.label)).join("|")})(?!\\d)(?!,\\s?\\d)`] : [])].join("|"),
    "g",
  );
  const parts: ({ text: string } | { text: string; iso: string })[] = [];
  let at = 0;
  for (const match of text.matchAll(pattern)) {
    const [whole, month, day, year, label] = match;
    let iso: string | undefined;
    if (month && year) {
      const number = MONTH_NUMBER[month.slice(0, 3).toLowerCase()];
      if (number) iso = day ? `${year}-${pad(number)}-${pad(Number(day))}` : `${year}-${pad(number)}`;
    } else if (label) {
      iso = known.find((date) => date.label === label)?.iso;
    }
    if (!iso) continue;
    if (match.index > at) parts.push({ text: text.slice(at, match.index) });
    parts.push({ text: whole, iso });
    at = match.index + whole.length;
  }
  if (at < text.length) parts.push({ text: text.slice(at) });
  return parts;
};

/**
 * Printed text whose dates are machine-readable (docs/seo/quality-gates.md, "Dates are
 * machine-readable"): every date a reading or brief belongs to sits in `<time dateTime>`,
 * and the words a reader sees are the same string the caller passed, so a sentence the
 * JSON-LD quotes still matches the page.
 */
export function DatedText({ text, dates }: { text: string; dates?: readonly KnownDate[] }): ReactNode {
  const parts = splitDates(text, dates);
  if (parts.every((part) => !("iso" in part))) return text;
  return parts.map((part, index) =>
    "iso" in part ? (
      <time key={index} dateTime={part.iso}>
        {part.text}
      </time>
    ) : (
      part.text
    ),
  );
}
