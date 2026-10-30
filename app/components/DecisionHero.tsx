import Link from "next/link";
import type { ReactNode } from "react";
import { NO_LIVE_READING_CALL } from "../../lib/report/reportCopy";
import { REGIME_LABELS, REGIME_WEATHER_RATIONALES, getRegimePublicLabel, isRegimeKey } from "../../lib/regimePresentation";
import { TrustStrip, type TrustStripProps } from "./trustStrip";
import { ScreenshotCaption } from "./screenshotCaption";
import { ConditionIcon } from "./ui/conceptIcons";

type Props = {
  /** The call, as the page's heading. Absent on a read that produced no live call. */
  weeklyCall?: string;
  /** Live week navigation shares the card header instead of occupying a separate band. */
  periodControl?: ReactNode;
  /** The longer sentence behind the call; printed only when it says more than the call does. */
  callDetail?: string;
  regime: string;
  /** The week's direction ("Tightening this week"), printed after what the regime means. */
  direction?: string;
  /**
   * What conditions were at the earlier reading, on a reading whose conditions
   * differ from it ("Was Sunny on Aug 31"). The change is the week's news, so it
   * sits on the stamp line in the regime ink rather than in a section below.
   */
  earlier?: string;
  /**
   * A graphic for the card's right-hand column from `md` up: on the brief, the
   * conditions map. The card is what people screenshot, so a picture of where
   * the reading sits travels with the call. Hidden below `md`, where the card
   * must leave the decision picker on the first phone screen.
   */
  aside?: ReactNode;
  /** Freshness and confidence, drawn once under the call. Absent on an archived week, which the banner above marks. */
  trust?: Omit<TrustStripProps, "href" | "className"> | null;
  /**
   * Which reading this is, for the caption at the foot of the card. Only an
   * archived week passes one: a live card dates itself in the trust strip, and
   * an archived card has no strip, so a crop of it would otherwise carry no date.
   */
  captionDetail?: string;
  /**
   * A question this card answers, for the pages a reader reaches from search
   * (`/answers/*`, `/signals/[cluster]`). It becomes the heading, set above the
   * call, and the call becomes the answer under it — the same card the brief
   * opens on, so a search visitor meets the artifact before any explanation.
   */
  question?: string;
  /**
   * The week's published brief, where it read different conditions from this
   * card: a caveat under the call, with the brief it links to. Without it a
   * reader comparing the card with /history found two answers for one week.
   */
  published?: { text: string; href: string };
  /**
   * The condition tied to the areas: which are on hold, and where each one's
   * concrete answer is. The call is a sentence about every decision at once;
   * this is the line that says which decisions it binds.
   */
  areas?: { text: string; href: string; action: string };
  /** The lines this answer is bounded by, under the call: pause, resume, where the call changes. */
  lines?: ReadonlyArray<{ label: string; value: string }>;
  /**
   * The nearer score on its ladder, drawn on a phone only, above the trust strip
   * (2026-10-27). From `md` the conditions map beside the call draws where the
   * reading sits; below it the map is hidden, and a phone screenshot of the card
   * was text alone, with the week's one tension, how near the line it is, stated
   * in 13px type in the strip. The site's rule is to draw a threshold claim where
   * it is made (ui-ux-standards §XV); this is that drawing.
   */
  phoneFigure?: ReactNode;
};

/**
 * The state tier, and nothing else: the weather word, the call as the page's
 * heading, what the word means for money in one line under it, the call's
 * longer sentence where it says more, and the trust strip. Everything the card used to carry after that —
 * the four signals, the rules by area, the lines and the flip watch, the share
 * actions — is a section of its own under it, in the order a reader asks the
 * questions. What is left fits above the fold on a phone.
 *
 * The card names its own regime so the surface and the stamp take their
 * colour from `data-regime` (tokens.css) — the same source as the copy, so
 * they cannot disagree with it.
 *
 * Two things the brief adds, because the card is what people screenshot: what
 * conditions were at the earlier reading, on the stamp line, and from `md` up a
 * graphic beside the call (the conditions map and its month-end path). Neither
 * renders unless passed, so the answer pages draw the card as before.
 */
export function DecisionHero({
  weeklyCall,
  periodControl,
  callDetail,
  regime,
  direction,
  earlier,
  aside,
  trust,
  captionDetail,
  question,
  lines,
  published,
  areas,
  phoneFigure,
}: Props) {
  const regimeDisplay = getRegimePublicLabel(regime);
  const regimeKey = isRegimeKey(regime) ? regime : undefined;
  const regimeWeatherLabel = (regimeKey ? REGIME_LABELS[regimeKey] : regimeDisplay).toUpperCase();
  const call = weeklyCall ?? NO_LIVE_READING_CALL.currentCall;
  const detail = callDetail && callDetail.trim() !== call.trim() ? callDetail : undefined;

  return (
    /*
     * `id="share-ready-artifact"` lives here, on the card that actually is the
     * share-ready artifact. It used to sit on a visually hidden `h1` in
     * `app/page.tsx`, which meant the screenshot capture waited on a zero-size
     * element and the "copy weekly brief" anchor jumped to nothing.
     */
    <section
      id="share-ready-artifact"
      className="weather-card weather-hero-card weather-inset relative overflow-hidden weather-editorial-hero"
      aria-labelledby="weekly-call-title"
      data-regime={regimeKey ?? undefined}
    >
      <div className="relative z-10 min-w-0 space-y-3">
        {/* With a graphic beside it, the left column stretches to the graphic's
            height and the trust row sits at its foot, so the call is not left
            floating over an empty band. */}
        <div className={aside ? "md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] md:gap-8" : undefined}>
        <div className="flex min-w-0 flex-col gap-2 sm:gap-3">
        {/* The kicker: the regime stamp, then what the week did — its direction
            and, on a week conditions moved, what they were. The regime's
            meaning is the line under the call, not this one: on the eyebrow it
            ran four facts together ("hard to raise · Tightening this week ·
            Was Cloudy on Sep 30") ahead of the call they lead into. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {periodControl ? <div className="weather-hero-period">{periodControl}</div> : null}
          <span className="type-stamp weather-tag-placard inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm font-semibold">
            {/* The weather the word names, beside it. An unknown regime prints
                its word alone: the sun it used to fall back to claimed a
                condition nobody had read. */}
            {regimeKey ? <ConditionIcon regime={regimeKey} /> : null}
            <span>{regimeWeatherLabel}</span>
          </span>

          {direction || earlier ? (
            <span className="text-fluid-xs font-medium leading-relaxed text-slate-200">
              {direction}
              {earlier ? (
                <span className="font-semibold" style={{ color: "var(--regime-ink)" }} data-earlier-conditions>
                  {/* The separator stays on the line before; a wrapped line must not open with "·". */}
                  {direction ? " · " : null}<span className="whitespace-nowrap">{earlier}</span>
                </span>
              ) : null}
            </span>
          ) : null}
        </div>

        {/* The homepage's `h1`. It was an `h2` under a visually hidden `h1`
            reading "Weekly Brief", so the one heading a crawler and a
            screen-reader user meet first said nothing this week that it did
            not say every week. The call is the page. On a page that asks a
            question, the question is the heading and the call answers it, in
            the same size and place. */}
        {question ? (
          <>
            <h1
              id="weekly-call-title"
              style={{ viewTransitionName: "page-title" }}
              className="max-w-2xl text-pretty text-fluid-lg font-semibold text-slate-300"
            >
              {question}
            </h1>
            <p className="max-w-2xl text-pretty text-display font-bold leading-[1.06] tracking-[-0.018em] text-slate-50">
              {call}
            </p>
          </>
        ) : (
          <h1
            id="weekly-call-title"
            style={{ viewTransitionName: "page-title" }}
            className="max-w-2xl text-pretty text-display font-bold leading-[1.06] tracking-[-0.018em] text-slate-50"
          >
            {call}
          </h1>
        )}

        {/* What the weather word means for money, as the line under the call:
            the stamp names the week, the call says what to do, this says why. */}
        {regimeKey ? (
          <p className="max-w-xl text-pretty text-fluid-base leading-snug text-slate-300" data-regime-meaning>
            {REGIME_WEATHER_RATIONALES[regimeKey]}
          </p>
        ) : null}

        {areas ? (
          <p className="max-w-xl text-fluid-sm font-medium leading-snug text-slate-100" data-held-areas>
            {areas.text}{" "}
            <Link href={areas.href} className="weather-hit text-[var(--accent-action)] underline underline-offset-4">
              {areas.action}
            </Link>
          </p>
        ) : null}

        {published ? (
          <p className="weather-caveat-mark max-w-xl text-sm leading-relaxed text-caveat-fg" data-published-differs>
            {published.text}{" "}
            <Link href={published.href} className="weather-hit underline decoration-slate-600 underline-offset-4">
              Read the published brief
            </Link>
          </p>
        ) : null}

        {lines && lines.length > 0 ? (
          <dl className="grid max-w-2xl gap-x-5 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
            {lines.map((line) => (
              <div key={line.label} className="space-y-0.5 sm:contents sm:space-y-0">
                <dt className="font-semibold text-slate-300">{line.label}</dt>
                <dd className="text-slate-100">{line.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {detail ? (
          <div className="max-w-xl border-l-2 border-[color:var(--border-strong)] pl-3 py-0.5">
            <p className="text-sm leading-relaxed text-slate-300">{detail}</p>
          </div>
        ) : null}

        {/* Freshness and confidence, once, where every reading route puts them:
            directly under the call. The chip-and-popover in the meta row and the
            trust line at the foot of the card both said this; neither said it
            where a reader deciding whether to act would look first. */}
        {phoneFigure ? <div className="md:hidden" data-hero-phone-figure>{phoneFigure}</div> : null}
        {trust ? (
          <TrustStrip
            {...trust}
            regime={regime}
            href="/trust"
            phoneLayout="line"
            compactLabels={Boolean(periodControl)}
            className="border-t border-[color:var(--border-faint)] pt-3 sm:pt-4 md:mt-auto"
          />
        ) : null}
        </div>
        {aside ? <div className="weather-hero-aside max-md:hidden">{aside}</div> : null}
        </div>

        {/* The card is the block people screenshot and crop, so it names its
            own source inside its border. */}
        <ScreenshotCaption
          detail={captionDetail}
          className="mt-1 border-t border-[color:var(--border-faint)] pt-2.5"
        />
      </div>
    </section>
  );
}
