import { ActionLink } from "./ui/actionLink";
import { ArrowRightIcon } from "./uiIcons";
import { formatMonthLongLabel } from "../../lib/timeMachine/monthFormatting";

/**
 * "You are not looking at this week."
 *
 * Whether is a screenshot product: the hero is meant to be pasted into Slack and read
 * as the current call. That makes an unmarked historical view the most expensive state
 * in the app — a March 2020 brief and this Monday's brief are visually identical once
 * cropped. So the marker is a caution-toned band rather than neutral chrome, and it
 * carries the exact record date, not just the month someone selected.
 *
 * Three things changed here from the version that only `/signals` rendered:
 *
 * 1. The date is formatted for a person. It printed `formatHistoricalBanner`'s
 *    "Historical mode active · 2020-03" — a machine string, and the second half of a
 *    label whose first half already said "Viewing past data". It now reads "March 2020"
 *    through `Intl` (per the i18n rule in docs/agents/ui-ux-standards.md).
 * 2. One action is primary. All three links were the same weight, so the way *out* of
 *    the mode had no more affordance than the two that go further into it.
 * 3. It is a named landmark. An `<aside>` with an accessible name is reachable from a
 *    screen reader's landmark list and announced on entry, so the mode is discoverable
 *    without reading down to a stale number. (Not `role="status"`: a live region
 *    announces mutations, and this is server-rendered — it would never fire.)
 */

type HistoricalBannerProps = {
  year: number;
  month: number;
  /** Record date the snapshot actually resolves to, e.g. "Mar 31, 2020". */
  asOfLabel?: string;
  liveHref?: string;
  previousHref?: string;
  timeMachineHref?: string;
};

export const HistoricalBanner = ({
  year,
  month,
  asOfLabel,
  liveHref,
  previousHref,
  timeMachineHref,
}: HistoricalBannerProps) => {
  const monthLabel = formatMonthLongLabel(year, month);
  const backwardHref = previousHref ?? timeMachineHref;

  return (
    <aside
      aria-label={`Viewing archived data for ${monthLabel}`}
      className="mt-6 overflow-hidden rounded-lg border border-l-4 border-[color:var(--color-semantic-caution-border)] bg-[color:var(--color-semantic-caution-bg)]"
    >
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {/* Not `.type-label`: it applies a hardcoded `text-slate-400` that outranks a
              Tailwind color utility here, so the eyebrow rendered grey in both themes
              and the band lost the one word that names the state. */}
          <p className="text-fluid-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-semantic-caution-fg)]">
            Archived view
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[var(--app-text)]">
            Viewing {monthLabel}
            {asOfLabel ? (
              <span className="font-normal text-[var(--app-text-muted)]"> · data as of {asOfLabel}</span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-[var(--app-text-muted)]">
            Live signals are hidden, and this call is not this week&apos;s. Go back to this week&apos;s
            call before acting on it.
          </p>
        </div>

        {/* Escape first and filled: it is the only action here that leaves the mode. */}
        <div className="flex shrink-0 flex-wrap gap-2">
          {liveHref ? (
            <ActionLink href={liveHref} variant="primary" className="gap-1.5">
              <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Back to this week
            </ActionLink>
          ) : null}
          {backwardHref ? (
            <ActionLink href={backwardHref} variant="ghost" className="gap-1.5">
              <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
              Earlier month
            </ActionLink>
          ) : null}
          {timeMachineHref ? (
            <ActionLink href={timeMachineHref} variant="ghost">
              Pick a date
            </ActionLink>
          ) : null}
        </div>
      </div>
    </aside>
  );
};
