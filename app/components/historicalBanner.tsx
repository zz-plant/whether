import { ActionLink } from "./ui/actionLink";
import { ArrowRightIcon } from "./uiIcons";
import { formatMonthLongLabel } from "../../lib/timeMachine/monthFormatting";

/**
 * "You are not looking at this week."
 *
 * Whether is a screenshot product: the hero is meant to be pasted into Slack and read
 * as the current call. That makes an unmarked historical view the most expensive state
 * in the app — a March 2020 brief and this Monday's brief are visually identical once
 * cropped. So the marker is a caveat band (ink, not the crossed red), and it carries the exact record date,
 * not just the month someone selected.
 *
 * One row, one action. It used to stack an eyebrow, a title, an explanatory paragraph
 * and up to three buttons — the archive state occupied half a phone screen before the
 * historical guidance began. The escape ("Back to this week") is the one action that
 * leaves the mode; going further *into* the archive is what the period controls next to
 * the week title are for (the calendar picker, and the command palette's archive
 * commands everywhere).
 *
 * Still a named landmark: an `<aside>` with an accessible name is reachable from a
 * screen reader's landmark list and announced on entry, so the mode is discoverable
 * without reading down to a stale number. (Not `role="status"`: a live region announces
 * mutations, and this is server-rendered — it would never fire.)
 */

type HistoricalBannerProps = {
  year: number;
  month: number;
  /** Record date the snapshot actually resolves to, e.g. "Aug 31, 2026". */
  asOfLabel?: string;
  liveHref?: string;
};

export const HistoricalBanner = ({
  year,
  month,
  asOfLabel,
  liveHref,
}: HistoricalBannerProps) => {
  const monthLabel = formatMonthLongLabel(year, month);

  return (
    <aside
      aria-label={`Viewing archived data for ${monthLabel}`}
      className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-l-4 border-caveat-border bg-caveat-bg px-4 py-2.5"
    >
      {/* Not `.type-label`: it applies a hardcoded `text-slate-400` that outranks a
          Tailwind color utility here, so the eyebrow rendered grey in both themes
          and the band lost the one word that names the state. */}
      <p className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-caveat-fg">
        Archived view
      </p>
      <p className="min-w-0 text-sm font-semibold text-[var(--app-text)]">
        Viewing {monthLabel}
        {asOfLabel ? (
          <span className="font-normal text-[var(--app-text-muted)]"> · data as of {asOfLabel}</span>
        ) : null}
      </p>
      {/* Escape first and filled: it is the only action here. */}
      {liveHref ? (
        <ActionLink href={liveHref} variant="primary" className="ml-auto gap-1.5">
          Back to this week
          <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
        </ActionLink>
      ) : null}
    </aside>
  );
};
