import Link from "next/link";
import monthly from "../../../data/advice-corpus/monthly.json";

const MIN_POSTS = 3;
const W = 64;
const H = 18;
const PAD_X = 2;
const PAD_Y = 2;

function buildSparklinePath(
  values: readonly (number | null)[],
  xOf: (index: number) => number,
  yOf: (share: number) => number,
) {
  let path = "";
  let drawing = false;
  values.forEach((value, index) => {
    if (value === null) {
      drawing = false;
      return;
    }
    path += `${drawing ? "L" : "M"}${xOf(index).toFixed(1)} ${yOf(value).toFixed(1)}`;
    drawing = true;
  });
  return path;
}

/**
 * Compact empirical teaser pointing to the VC-advice study (`/research/advice-vs-market`, `/concepts` until 2026-11-25).
 * Draws a 64x18 dual-line micro-sparkline from `data/advice-corpus/monthly.json`
 * (expand vs. conserve shares across the July 2022 funding-pressure crossing).
 */
export function AdviceStudyTeaser({ className = "" }: { className?: string }) {
  const quarters = monthly.quarters;
  if (quarters.length < 2) return null;

  const step = (W - PAD_X * 2) / (quarters.length - 1);
  const xOf = (index: number) => PAD_X + index * step;
  const yOf = (share: number) => PAD_Y + (H - PAD_Y * 2) * (1 - share);

  const expandPath = buildSparklinePath(
    quarters.map((row) => (row.posts >= MIN_POSTS ? row.expand : null)),
    xOf,
    yOf,
  );
  const conservePath = buildSparklinePath(
    quarters.map((row) => (row.posts >= MIN_POSTS ? row.conserve : null)),
    xOf,
    yOf,
  );

  const crossingMonth = monthly.eras[1]?.from;
  const firstYear = Number(quarters[0]?.period.slice(0, 4) ?? 2012);
  const crossingX = crossingMonth
    ? PAD_X + ((Number(crossingMonth.slice(0, 4)) - firstYear) * 4 + (Number(crossingMonth.slice(5, 7)) - 1) / 3) * step
    : null;

  return (
    <aside
      data-advice-study-teaser
      aria-label="Advice vs. market study"
      className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[color:var(--border-default)] pt-4 ${className}`.trim()}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          aria-hidden="true"
          focusable="false"
          data-advice-study-sparkline
          className="shrink-0"
        >
          {crossingX !== null ? (
            <line
              x1={crossingX.toFixed(1)}
              x2={crossingX.toFixed(1)}
              y1={0}
              y2={H}
              stroke="var(--phase-boundary)"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          ) : null}
          <path d={expandPath} fill="none" stroke="var(--app-text)" strokeWidth="1.5" strokeLinejoin="round" />
          <path
            d={conservePath}
            fill="none"
            stroke="var(--app-text-secondary)"
            strokeWidth="1.25"
            strokeDasharray="3 2"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-fluid-sm text-slate-300">
          Across {monthly.eligiblePosts.toLocaleString("en-US")} posts from {monthly.firms.length} venture firms,
          investor advice did not turn conservative when funding pressure crossed 70.
        </p>
      </div>
      <Link
        href="/research/advice-vs-market"
        className="weather-hit weather-focus-ring weather-press-scale shrink-0 text-fluid-sm font-semibold text-sky-300 underline decoration-slate-600 underline-offset-4 transition-colors hover:text-sky-200"
      >
        Read the study &rarr;
      </Link>
    </aside>
  );
}
