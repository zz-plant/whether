"use client";

import { useMemo, useState } from "react";
import { Field } from "@base-ui/react/field";
import { Input } from "@base-ui/react/input";
import { Select } from "@base-ui/react/select";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import type { RegimeAssessment } from "../../../lib/regimeEngine";
import { formatDateUTC } from "../../../lib/formatters";
import { insightDatabase } from "../../../data/recommendations";
import { CollapsibleDeepDive } from "../collapsibleDeepDive";
import { DataProvenanceStrip, type DataProvenance } from "../dataProvenanceStrip";
import { getRegimeLabel, sortClimateKeys } from "../reportSectionUtils";

export const InsightDatabasePanel = ({
  regime,
  provenance,
  showProvenance = true,
}: {
  regime: RegimeAssessment["regime"];
  provenance: DataProvenance;
  showProvenance?: boolean;
}) => {
  type EvidenceLibraryItem = Omit<
    (typeof insightDatabase.regimeEvidence.regimes)[number]["citations"][number],
    "tags"
  > & {
    climate: string;
    summary: string;
    id: string;
    tags: readonly string[];
  };

  const evidence = insightDatabase.regimeEvidence.regimes.find((entry) => entry.key === regime);
  const fossilRecord = insightDatabase.fossilRecord;
  const evidenceLibrary = useMemo<EvidenceLibraryItem[]>(
    () =>
      insightDatabase.regimeEvidence.regimes.flatMap((entry) =>
        entry.citations.map((citation, index) => {
          const climate = citation.climate ?? entry.key;
          return {
            ...citation,
            climate,
            summary: entry.summary,
            id: `${climate}-${index}-${citation.url}`,
            tags: citation.tags,
          };
        }),
      ),
    [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClimate, setSelectedClimate] = useState("all");
  const [selectedSignal, setSelectedSignal] = useState("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const climateOptions = useMemo(
    () => Array.from(new Set(evidenceLibrary.map((item) => item.climate))).sort(sortClimateKeys),
    [evidenceLibrary],
  );
  const signalOptions = useMemo(
    () => Array.from(new Set(evidenceLibrary.map((item) => item.signal))).sort(),
    [evidenceLibrary],
  );
  const tagOptions = useMemo(
    () => Array.from(new Set(evidenceLibrary.flatMap((item) => item.tags))).sort(),
    [evidenceLibrary],
  );
  const filteredEvidence = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const startTime = dateRange.start ? Date.parse(dateRange.start) : null;
    const endTime = dateRange.end ? Date.parse(dateRange.end) : null;

    return evidenceLibrary.filter((item) => {
      if (selectedClimate !== "all" && item.climate !== selectedClimate) {
        return false;
      }
      if (selectedSignal !== "all" && item.signal !== selectedSignal) {
        return false;
      }
      if (selectedTags.length > 0 && !selectedTags.some((tag) => item.tags.includes(tag))) {
        return false;
      }
      if (normalizedQuery) {
        const haystack = [
          item.title,
          item.source,
          item.signal,
          item.summary,
          item.recommendation?.label,
          ...item.tags,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(normalizedQuery)) {
          return false;
        }
      }
      if (startTime || endTime) {
        const itemTime = Date.parse(item.date);
        if (!Number.isNaN(itemTime)) {
          if (startTime && itemTime < startTime) {
            return false;
          }
          if (endTime && itemTime > endTime) {
            return false;
          }
        }
      }
      return true;
    });
  }, [
    dateRange.end,
    dateRange.start,
    evidenceLibrary,
    searchQuery,
    selectedClimate,
    selectedSignal,
    selectedTags,
  ]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((entry) => entry !== tag) : [...prev, tag],
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedClimate("all");
    setSelectedSignal("all");
    setDateRange({ start: "", end: "" });
    setSelectedTags([]);
  };

  return (
    <section id="insight-database" aria-labelledby="insight-database-title" className="mt-10">
      <div className="weather-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="type-label text-slate-400">Insight database</p>
            <h3 id="insight-database-title" className="type-section text-slate-100">
              Evidence-backed climate rationale
            </h3>
            <p className="mt-2 type-data text-slate-300">
              Attach cited macro evidence and historical patterns to explain the current posture.
            </p>
          </div>
          {showProvenance ? <DataProvenanceStrip provenance={provenance} /> : null}
        </div>
        <div className="mt-4 weather-surface p-4">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
            Executive summary
          </p>
          <p className="mt-2 text-sm text-slate-200">
            {evidence?.summary ?? "No evidence summary available for this climate."}
          </p>
        </div>
        <CollapsibleDeepDive
          label="Deep dive: searchable evidence library"
          panelClassName="mt-4 space-y-4"
        >
          <div className="weather-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                Filter evidence
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold tracking-[0.12em] text-slate-300 underline decoration-slate-500 underline-offset-4 transition-opacity hover:text-slate-100"
              >
                Clear filters
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field.Root className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                <Field.Label>Search</Field.Label>
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by source, tag, or recommendation"
                  className="mt-2 w-full rounded-lg border border-slate-800/70 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
                />
              </Field.Root>
              <Field.Root className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                <Field.Label id="evidence-climate-label" nativeLabel={false} render={<span />}>
                  Climate
                </Field.Label>
                <Select.Root
                  value={selectedClimate}
                  onValueChange={(value) => setSelectedClimate(value as string)}
                >
                  <Select.Trigger
                    aria-labelledby="evidence-climate-label"
                    className="mt-2 flex min-h-[44px] w-full items-center justify-between rounded-lg border border-slate-800/70 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  >
                    <Select.Value placeholder="All postures" />
                    <Select.Icon className="text-slate-400">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                        <path
                          d="M7 10l5 5 5-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner side="bottom" align="start" sideOffset={8}>
                      <Select.Popup className="min-w-[220px] rounded-md border border-slate-800/80 bg-slate-950/95 p-1 text-sm text-slate-100 shadow-xl">
                        <Select.List className="max-h-64 overflow-y-auto">
                          <Select.Item
                            value="all"
                            className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-colors data-[highlighted]:bg-slate-800/70 data-[selected]:text-sky-200"
                          >
                            <Select.ItemText>All postures</Select.ItemText>
                          </Select.Item>
                          {climateOptions.map((option) => (
                            <Select.Item
                              key={option}
                              value={option}
                              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-colors data-[highlighted]:bg-slate-800/70 data-[selected]:text-sky-200"
                            >
                              <Select.ItemText>
                                {getRegimeLabel(option as RegimeAssessment["regime"])}
                              </Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.List>
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
              </Field.Root>
              <Field.Root className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                <Field.Label id="evidence-signal-label" nativeLabel={false} render={<span />}>
                  Signal
                </Field.Label>
                <Select.Root
                  value={selectedSignal}
                  onValueChange={(value) => setSelectedSignal(value as string)}
                >
                  <Select.Trigger
                    aria-labelledby="evidence-signal-label"
                    className="mt-2 flex min-h-[44px] w-full items-center justify-between rounded-lg border border-slate-800/70 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  >
                    <Select.Value placeholder="All signals" />
                    <Select.Icon className="text-slate-400">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                        <path
                          d="M7 10l5 5 5-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Positioner side="bottom" align="start" sideOffset={8}>
                      <Select.Popup className="min-w-[220px] rounded-md border border-slate-800/80 bg-slate-950/95 p-1 text-sm text-slate-100 shadow-xl">
                        <Select.List className="max-h-64 overflow-y-auto">
                          <Select.Item
                            value="all"
                            className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-colors data-[highlighted]:bg-slate-800/70 data-[selected]:text-sky-200"
                          >
                            <Select.ItemText>All signals</Select.ItemText>
                          </Select.Item>
                          {signalOptions.map((option) => (
                            <Select.Item
                              key={option}
                              value={option}
                              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-200 outline-none transition-colors data-[highlighted]:bg-slate-800/70 data-[selected]:text-sky-200"
                            >
                              <Select.ItemText>{option}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.List>
                      </Select.Popup>
                    </Select.Positioner>
                  </Select.Portal>
                </Select.Root>
              </Field.Root>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field.Root className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  <Field.Label>Start date</Field.Label>
                  <Input
                    type="date"
                    value={dateRange.start}
                    aria-describedby="evidence-date-hint"
                    onChange={(event) =>
                      setDateRange((prev) => ({ ...prev, start: event.target.value }))
                    }
                    className="mt-2 w-full rounded-lg border border-slate-800/70 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  />
                </Field.Root>
                <Field.Root className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                  <Field.Label>End date</Field.Label>
                  <Input
                    type="date"
                    value={dateRange.end}
                    aria-describedby="evidence-date-hint"
                    onChange={(event) =>
                      setDateRange((prev) => ({ ...prev, end: event.target.value }))
                    }
                    className="mt-2 w-full rounded-lg border border-slate-800/70 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  />
                </Field.Root>
              </div>
              <p id="evidence-date-hint" className="text-xs text-slate-500">
                Use YYYY-MM-DD to filter evidence by publish date.
              </p>
            </div>
            <div className="mt-4">
              <p
                id="evidence-tags-label"
                className="text-xs font-semibold tracking-[0.12em] text-slate-400"
              >
                Tags
              </p>
              <ToggleGroup
                value={selectedTags}
                onValueChange={(value) => setSelectedTags(value as string[])}
                multiple
                aria-labelledby="evidence-tags-label"
                className="mt-2 flex flex-wrap gap-2"
              >
                {tagOptions.map((tag) => (
                  <Toggle
                    key={tag}
                    value={tag}
                    className="min-h-[44px] rounded-full border border-slate-700/70 px-3 py-2 text-xs font-semibold tracking-[0.12em] text-slate-300 transition-colors data-[pressed]:border-sky-400/70 data-[pressed]:bg-sky-500/20 data-[pressed]:text-sky-100 hover:border-slate-500/80 hover:text-slate-100"
                  >
                    {tag}
                  </Toggle>
                ))}
              </ToggleGroup>
            </div>
          </div>
          <div
            className="mt-4 flex items-center justify-between text-xs font-semibold tracking-[0.12em] text-slate-400"
            role="status"
            aria-live="polite"
          >
            <span>{filteredEvidence.length} evidence items</span>
            <span>Linked recommendations included</span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {filteredEvidence.length === 0 ? (
              <div className="weather-surface p-4 text-sm text-slate-400">
                No evidence items match these filters. Try clearing the date range or tags.
              </div>
            ) : (
              filteredEvidence.map((item) => (
                <article key={item.id} className="weather-surface p-4">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                    {item.source}
                  </p>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block text-sm font-semibold text-slate-100 underline decoration-slate-500 underline-offset-4 hover:text-slate-50"
                  >
                    {item.title}
                  </a>
                  <p className="mt-2 text-xs text-slate-500">{item.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                    <span className="weather-pill-muted inline-flex items-center px-2 py-1">
                      Climate: {getRegimeLabel(item.climate as RegimeAssessment["regime"])}
                    </span>
                    <span className="weather-pill-muted inline-flex items-center px-2 py-1">
                      Signal: {item.signal}
                    </span>
                    <span className="weather-pill-muted inline-flex items-center px-2 py-1">
                      Date: {formatDateUTC(item.date)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <button
                        key={`${item.id}-${tag}`}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        aria-pressed={selectedTags.includes(tag)}
                        aria-label={`Filter by ${tag}`}
                        className={`min-h-[44px] rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.12em] transition-colors ${
                          selectedTags.includes(tag)
                            ? "border-sky-400/70 bg-sky-500/15 text-sky-100"
                            : "border-slate-700/70 text-slate-300 hover:border-slate-500/80 hover:text-slate-100"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  {item.recommendation ? (
                    <p className="mt-4 text-xs text-slate-400">
                      Decision recommendation:{" "}
                      <a
                        href={item.recommendation.href}
                        className="touch-target inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.12em] text-slate-200 underline decoration-slate-500 underline-offset-4 hover:text-slate-100"
                      >
                        {item.recommendation.label}
                      </a>
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </CollapsibleDeepDive>
        <CollapsibleDeepDive label={`Deep dive: ${fossilRecord.title}`}>
          <div className="weather-surface p-4">
            <p className="type-label text-slate-400">{fossilRecord.title}</p>
            <p className="mt-2 text-xs text-slate-500">{fossilRecord.subtitle}</p>
            <p className="mt-3 text-sm text-slate-300">{fossilRecord.description}</p>
          </div>
          <div className="mt-4 overflow-x-auto overscroll-contain">
            <table className="min-w-full text-left text-sm text-slate-300">
              <caption className="sr-only">{fossilRecord.title} comparison table</caption>
              <thead className="text-xs font-semibold tracking-[0.12em] text-slate-400">
                <tr>
                  <th scope="col" className="px-3 py-2">
                    {fossilRecord.columns.domain}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {fossilRecord.columns.lowRateArtifact}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {fossilRecord.columns.highRateArtifact}
                  </th>
                  <th scope="col" className="px-3 py-2">
                    {fossilRecord.columns.insight}
                  </th>
                </tr>
              </thead>
              <tbody>
                {fossilRecord.rows.map((row) => (
                  <tr key={row.domain} className="border-t border-slate-800/60">
                    <td className="px-3 py-3 text-slate-200">{row.domain}</td>
                    <td className="px-3 py-3">{row.lowRateArtifact}</td>
                    <td className="px-3 py-3">{row.highRateArtifact}</td>
                    <td className="px-3 py-3">{row.insight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleDeepDive>
      </div>
    </section>
  );
};
