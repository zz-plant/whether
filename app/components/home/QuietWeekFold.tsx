import type { ReactNode } from "react";
import { HOME_SECTIONS } from "../../../lib/report/home/homeSectionModel";
import { ActionLink } from "../ui/actionLink";

/**
 * A quiet week's explanation, folded under one line (2026-11-03).
 *
 * Conditions changed seven times in 177 months, so most Mondays no area moves and
 * nothing is close to moving, and the page still printed every section a changing
 * week needs: what changed, why the conditions are what they are, what would change
 * them, who will ask, how unusual this is. On those weeks the card and the areas
 * are the whole answer, so the sections that explain it fold under "The full
 * reading". They stay server-rendered, so find-in-page, a search engine and a link
 * to any section still reach them (`AnchorFeedback` opens the fold for a hash).
 *
 * The line above the fold is the alert's promise: the email does the watching, so a
 * reader can skip the weeks nothing moves.
 */
export function QuietWeekFold({
  quiet,
  regimeLabel,
  children,
}: {
  /** No area moved since the earlier reading, conditions held, and nothing is close to changing. */
  quiet: boolean;
  /** This week's conditions, for the fold's summary. */
  regimeLabel: string;
  /** The explanatory sections, printed open on any week that is not quiet. */
  children: ReactNode;
}) {
  if (!quiet) return <>{children}</>;
  return (
    <section data-quiet-week aria-label="The full reading" className="space-y-3 border-t border-[color:var(--border-subtle)] pt-4">
      <p className="text-fluid-sm text-slate-300">
        Nothing is close to changing this week.{" "}
        <ActionLink href={`#${HOME_SECTIONS.alert.id}`} variant="inline">
          Get an email the day an area pauses or restarts
        </ActionLink>
        , and skip the Mondays when nothing moves.
      </p>
      <details className="weather-auto-chevron group" data-quiet-week-fold>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-sky-200 hover:text-slate-100">
          {`The full reading: what changed, why conditions are ${regimeLabel} and what would change them`}
        </summary>
        <div className="mt-4 space-y-4 sm:space-y-8">{children}</div>
      </details>
    </section>
  );
}
