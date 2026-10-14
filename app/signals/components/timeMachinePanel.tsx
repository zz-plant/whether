/**
 * Month picker: shows what the brief said in an earlier month, with client-side
 * validation. Keeps URL-driven state consistent while giving immediate feedback
 * on which months are available.
 */
"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { Fieldset } from "@base-ui/react/fieldset";
import { Form } from "@base-ui/react/form";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isRoute, type Route } from "../../../lib/navigation/routeType";
import { SectionPanelHeader } from "../../components/sectionPanelHeader";
import { ActionLink } from "../../components/ui/actionLink";
import { SpinnerIcon } from "../../components/uiIcons";
import type { RegimeKey } from "../../../lib/regimeEngine";
import { REGIME_LABELS } from "../../../lib/regimePresentation";
import {
  formatDateLabel,
  formatMonthInput,
  monthOptions,
} from "./timeMachineUtils";
import {
  buildTimeMachineClearDraftHref,
  buildTimeMachineDraftHref,
  buildTimeMachineJumpToLatestHref,
  buildTimeMachineNowHref,
  buildTimeMachineSnapshotHref,
  buildTimeMachineSubmitHref,
} from "../evidenceQueryState";
import { TimeMachineMonthPicker } from "./TimeMachineMonthPicker";

type TimeMachinePanelProps = {
  selectedYear: number;
  selectedMonth: number;
  isHistorical: boolean;
  latestRecordDate: string;
  cacheCoverage: { earliest: string | null; latest: string | null };
  monthsByYear: Record<number, number[]>;
  invalidSelection: boolean;
  historicalRegime?: RegimeKey | null;
  historicalSummary?: string | null;
};

export const TimeMachinePanel = ({
  selectedYear,
  selectedMonth,
  isHistorical,
  latestRecordDate,
  cacheCoverage,
  monthsByYear,
  invalidSelection,
  historicalRegime,
  historicalSummary,
}: TimeMachinePanelProps) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const errorId = "time-machine-error";
  const monthRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const parseQueryNumber = (value: string | null, fallback: number) => {
    if (!value) {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const draftMonthParam = searchParams.get("draftMonth");
  const draftYearParam = searchParams.get("draftYear");
  const queryMonthParam = draftMonthParam ?? searchParams.get("month");
  const queryYearParam = draftYearParam ?? searchParams.get("year");
  const month = parseQueryNumber(queryMonthParam, selectedMonth);
  const year = parseQueryNumber(queryYearParam, selectedYear);
  const isDraft = Boolean(draftMonthParam || draftYearParam);

  const availableMonths = useMemo(() => monthsByYear[year] ?? [], [monthsByYear, year]);
  const isUnavailableSelection =
    invalidSelection || (availableMonths.length > 0 && !availableMonths.includes(month));
  const isInvalid = Boolean(errorMessage);
  const requestedMonthLabel =
    monthOptions.find((option) => option.value === month)?.label ?? `Month ${month}`;
  const coverageLabel =
    cacheCoverage.earliest && cacheCoverage.latest
      ? {
          earliest: formatDateLabel(cacheCoverage.earliest),
          latest: formatDateLabel(cacheCoverage.latest),
        }
      : null;
  const latestRecordLabel = formatDateLabel(latestRecordDate);
  const selectedLabel = `${requestedMonthLabel} ${year}`;
  const showHistoricalCallout = isHistorical && historicalSummary;
  const statusMessages = [
    errorMessage
      ? { key: "error", message: errorMessage, includeId: true }
      : null,
    invalidSelection
      ? {
          key: "invalid",
          message: "That month is not available. Showing the latest instead.",
          includeId: false,
        }
      : null,
  ].filter((item): item is { key: string; message: string; includeId: boolean } => Boolean(item));
  const coverageMin = cacheCoverage.earliest ? formatMonthInput(cacheCoverage.earliest) : undefined;
  const coverageMax = cacheCoverage.latest ? formatMonthInput(cacheCoverage.latest) : undefined;
  const latestMonthValue = formatMonthInput(latestRecordDate);
  const availableYears = useMemo(
    () =>
      Object.keys(monthsByYear)
        .map((value) => Number(value))
        .filter((value) => !Number.isNaN(value))
        .sort((a, b) => a - b),
    [monthsByYear]
  );
  const minYear = availableYears.at(0) ?? year;
  const maxYear = availableYears.at(-1) ?? year;
  const orderedSnapshots = useMemo(
    () =>
      Object.entries(monthsByYear)
        .flatMap(([yearKey, months]) =>
          months.map((monthValue) => ({ year: Number(yearKey), month: monthValue }))
        )
        .filter((entry) => !Number.isNaN(entry.year))
        .sort((a, b) => a.year - b.year || a.month - b.month),
    [monthsByYear]
  );
  const selectedSnapshotIndex = orderedSnapshots.findIndex(
    (entry) => entry.year === year && entry.month === month
  );
  const previousSnapshot = selectedSnapshotIndex > 0 ? orderedSnapshots[selectedSnapshotIndex - 1] : null;
  const nextSnapshot =
    selectedSnapshotIndex >= 0 && selectedSnapshotIndex < orderedSnapshots.length - 1
      ? orderedSnapshots[selectedSnapshotIndex + 1]
      : null;
  /* Which year the calendar is browsing, which starts at the selected year and
     follows it whenever the selection moves. Stamped with the year it was picked
     against rather than re-assigned from an effect on every selection change:
     the effect version rendered the calendar on the old year first and corrected
     it on a second pass. */
  const [browsedYear, setBrowsedYear] = useState<{ forYear: number; value: number } | null>(null);
  const calendarYear = browsedYear?.forYear === year ? browsedYear.value : year;
  const calendarMonths = monthsByYear[calendarYear] ?? [];
  const setCalendarYear = useCallback(
    (value: number) => setBrowsedYear({ forYear: year, value }),
    [year],
  );

  const handleSubmit = () => {
    if (isUnavailableSelection) {
      setErrorMessage("That month is not available for the selected year.");
      monthRef.current?.focus();
      return;
    }
    setErrorMessage(null);
    startTransition(() => {
      router.push(
        buildTimeMachineSubmitHref(pathname, searchParams, { month, year }) as Route,
        { scroll: false },
      );
    });
  };

  const handleMonthChange = (nextYear: number, nextMonth: number) => {
    setErrorMessage(null);
    router.push(
      buildTimeMachineDraftHref(pathname, searchParams, {
        month: nextMonth,
        year: nextYear,
      }) as Route,
      { scroll: false },
    );
  };

  const clearDraftHref = useMemo(
    () => buildTimeMachineClearDraftHref(pathname, searchParams),
    [pathname, searchParams],
  );

  const jumpToLatestHref = useMemo(
    () => buildTimeMachineJumpToLatestHref(pathname, searchParams, latestMonthValue ?? ""),
    [latestMonthValue, pathname, searchParams],
  );

  const nowHref = useMemo(
    () => buildTimeMachineNowHref(pathname, searchParams),
    [pathname, searchParams],
  );

  const previousSnapshotHref = buildTimeMachineSnapshotHref(
    pathname,
    searchParams,
    previousSnapshot,
  );
  const nextSnapshotHref = buildTimeMachineSnapshotHref(
    pathname,
    searchParams,
    nextSnapshot,
  );
  const nowDecisionHref = `${nowHref}#what-changed`;
  const centeredPillLinkClass = "justify-center";

  // No panel of its own: this sits inside the earlier-month disclosure on the
  // evidence page, which is the box.
  return (
    <section id="time-machine" aria-labelledby="time-machine-title" className="mt-4">
      <div>
        <SectionPanelHeader
          label="Past months"
          title="Pick a month"
          titleId="time-machine-title"
          description={
            <>
              The page loads the last Treasury reading on or before it and shows that month&apos;s
              guidance.
            </>
          }
          aside={
            <>
              {isHistorical ? (
                <ActionLink
                  href={nowDecisionHref as Route}
                  className={centeredPillLinkClass}
                >
                  Back to this week
                </ActionLink>
              ) : null}
            </>
          }
        />

        {/* One line and the step links. This was three cards — "Month showing",
            "Month loaded" and "Step through months" — that named the selected
            month three times, one of them under a staggered entry animation
            on a settings form. A previous or next month that does not exist
            renders no link, rather than a disabled pill that looks like one. */}
        <div className="mt-6 space-y-3">
          <p className="type-data text-slate-300">
            {isHistorical ? (
              <>
                This page is showing{" "}
                <span className="font-semibold text-slate-100">{selectedLabel}</span>. This week&apos;s
                reading is dated {latestRecordLabel}.
              </>
            ) : (
              <>
                This page is showing this week ({latestRecordLabel}).
              </>
            )}
          </p>
          {showHistoricalCallout ? (
            <div className="weather-surface p-3">
              <p className="type-label text-slate-400">
                What it meant · {historicalRegime ? REGIME_LABELS[historicalRegime] : "—"}
              </p>
              <p className="mt-2 text-sm text-slate-200">{historicalSummary}</p>
            </div>
          ) : null}
          <nav aria-label="Step through months" className="flex flex-wrap gap-2">
            {previousSnapshotHref && isRoute(previousSnapshotHref) ? (
              <ActionLink href={previousSnapshotHref} className={centeredPillLinkClass}>
                ← Previous month
              </ActionLink>
            ) : null}
            {nextSnapshotHref && isRoute(nextSnapshotHref) ? (
              <ActionLink href={nextSnapshotHref} className={centeredPillLinkClass}>
                Next month →
              </ActionLink>
            ) : null}
            <ActionLink href={isRoute(nowHref) ? nowHref : "/signals"} className={centeredPillLinkClass}>
              This week
            </ActionLink>
          </nav>
        </div>

        <Form onFormSubmit={handleSubmit} className="mt-6">
          <Fieldset.Root className="grid min-w-0 gap-4 border-0 p-0 md:grid-cols-[1fr,auto]">
            <Fieldset.Legend className="sr-only">Choose a month and load it</Fieldset.Legend>
            <TimeMachineMonthPicker
              monthRef={monthRef}
              selectedLabel={selectedLabel}
              isInvalid={isInvalid}
              errorId={errorId}
              calendarYear={calendarYear}
              minYear={minYear}
              maxYear={maxYear}
              month={month}
              year={year}
              calendarMonths={calendarMonths}
              monthOptions={monthOptions}
              coverageMin={coverageMin}
              coverageMax={coverageMax}
              onCalendarYearChange={setCalendarYear}
              onSelectMonth={handleMonthChange}
              onUnavailableSelection={() => {
                setErrorMessage("That month is not available for the selected year.");
              }}
            />
            <button
              type="submit"
              disabled={isPending}
              aria-busy={isPending}
              className="weather-button-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-400"
            >
              {isPending ? <SpinnerIcon className="h-3 w-3" /> : null}
              {isPending ? "Loading" : "Load month"}
            </button>
          </Fieldset.Root>
        </Form>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <ActionLink
            href={clearDraftHref}
            className="justify-center text-slate-300 hover:border-slate-500/70"
          >
            Clear the pick
          </ActionLink>
          <ActionLink
            href={jumpToLatestHref}
            className={centeredPillLinkClass}
          >
            Latest month
          </ActionLink>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
          <div className="weather-surface grid gap-3 p-4 sm:grid-cols-2">
            <div>
              <p className="type-label text-slate-400">Latest reading</p>
              <p className="mt-2 text-sm text-slate-200">
                <span className="mono text-slate-100">
                  <time dateTime={latestRecordDate}>{latestRecordLabel}</time>
                </span>
              </p>
            </div>
            <div>
              <p className="type-label text-slate-400">Months available</p>
              <p className="mt-2 text-sm text-slate-200">
                <span className="mono text-slate-100">
                  {coverageLabel && cacheCoverage.earliest && cacheCoverage.latest ? (
                    <>
                      <time dateTime={cacheCoverage.earliest}>{coverageLabel.earliest}</time> →{" "}
                      <time dateTime={cacheCoverage.latest}>{coverageLabel.latest}</time>
                    </>
                  ) : (
                    "None available"
                  )}
                </span>
              </p>
            </div>
            {isDraft ? (
              <div className="rounded-md border border-sky-400/20 bg-sky-500/8 px-3 py-3 sm:col-span-2">
                <p className="type-label text-sky-200">Month picked</p>
                <p className="mt-2 text-sm text-slate-200">
                  {selectedLabel} is picked. Load it to see that month&apos;s guidance.
                </p>
              </div>
            ) : null}
          </div>
          {statusMessages.length > 0 ? (
            <output
              id={statusMessages.some((message) => message.includeId) ? errorId : undefined}
              className="weather-surface block space-y-2 !border-amber-400/30 !bg-amber-500/8 p-4 text-sm text-amber-100"
              aria-live="polite"
            >
              {statusMessages.map((message) => (
                <p key={message.key}>{message.message}</p>
              ))}
            </output>
          ) : null}
        </div>
      </div>
    </section>
  );
};
