"use client";

import { useState } from "react";
import { useLocalStorageState } from "../../lib/hooks/useLocalStorageState";
import { STORAGE_KEYS } from "../../lib/storage/keys";
import { useBriefArtifact } from "./useBriefArtifact";
import {
  countClosedWeeks,
  formatDriftLabel,
  reopenCloseout,
  selectPreviousCloseout,
  type CloseoutStore,
} from "../../lib/report/weeklyCloseout";

/**
 * Closes the week with a record instead of a checkmark.
 *
 * `RitualCheck` ended the weekly review with "Mark reviewed", four dots and a
 * flame streak. A streak measures attendance; what a decision meeting produces
 * is a decision. This asks the two questions the meeting actually answers —
 * what did you change, what are you watching — and reopens the answer next week
 * against the areas the model has queued again.
 *
 * It reads the published brief island for this week's areas and conditions, the
 * same object the share formats and presentation frames use, so the areas
 * offered here are the ones the brief just listed.
 *
 * The device-scope line is not decoration. Of eleven localStorage-backed
 * surfaces, this was among the six that never said where the data lived —
 * directly below `DecisionStalenessPanel`, which does say it.
 */
export function WeeklyCloseout({
  recordDate,
  recentRecordDates = [],
}: {
  recordDate?: string;
  recentRecordDates?: readonly string[];
}) {
  const artifact = useBriefArtifact();
  const [store, setStore] = useLocalStorageState<CloseoutStore>(STORAGE_KEYS.weeklyCloseouts, {});
  const [changed, setChanged] = useState<string[]>([]);
  const [watching, setWatching] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);

  if (!recordDate) return null;

  const saved = store[recordDate];
  const revisitAreas = artifact?.revisit?.map((item) => item.label) ?? [];
  const areaChoices = [...revisitAreas, ...(artifact?.noChangeAreas ?? [])];
  const watchChoices = artifact?.clearsWhen ?? [];
  const reopened = reopenCloseout({
    record: selectPreviousCloseout(store, recordDate),
    revisitAreas,
    conditions: artifact
      ? { tightness: artifact.tightness, riskAppetite: artifact.riskAppetite }
      : undefined,
  });
  const closedCount = countClosedWeeks(store, recentRecordDates);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];

  const handleClose = () => {
    setStore((previous) => ({
      ...previous,
      [recordDate]: {
        recordDate,
        closedAt: new Date().toISOString(),
        changed,
        watching,
        note: note.trim() || undefined,
        conditions: artifact
          ? { tightness: artifact.tightness, riskAppetite: artifact.riskAppetite }
          : undefined,
      },
    }));
    setEditing(false);
  };

  const handleReopen = () => {
    setChanged(saved?.changed ?? []);
    setWatching(saved?.watching ?? []);
    setNote(saved?.note ?? "");
    setEditing(true);
  };

  const Chip = ({
    label,
    active,
    onToggle,
  }: {
    label: string;
    active: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`min-h-11 rounded-md border px-3 py-1.5 text-left text-fluid-xs font-medium transition-colors weather-focus-ring ${
        active
          ? "border-sky-500/30 bg-sky-500/12 text-sky-100"
          : "border-white/[0.10] text-slate-300 hover:bg-slate-800/50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <section
      aria-labelledby="weekly-closeout-heading"
      data-sticky-strip-hide
      className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="weekly-closeout-heading" className="type-section font-semibold tracking-tight text-white">
          Close the week
        </h2>
        {recentRecordDates.length > 0 ? (
          <span className="text-fluid-nano text-slate-400">
            {closedCount} of the last {recentRecordDates.length} weeks closed
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-fluid-nano leading-5 text-white/45">
        A private note to your future self. It stays in this browser and is not sent anywhere.
      </p>

      {reopened ? (
        <div className="mt-3 rounded-lg border border-slate-800/60 bg-slate-950/40 px-3 py-2.5">
          <p className="text-fluid-nano type-eyebrow text-white/50">
            Last close · {reopened.record.recordDate}
          </p>
          {reopened.flaggedAgain.length > 0 ? (
            <p className="mt-1 text-fluid-xs leading-5 text-amber-200">
              <span className="font-semibold">Flagged again:</span>{" "}
              {reopened.flaggedAgain.join(" · ")}
            </p>
          ) : null}
          {reopened.settled.length > 0 ? (
            <p className="mt-1 text-fluid-xs leading-5 text-slate-400">
              <span className="font-semibold text-slate-300">Held:</span> {reopened.settled.join(" · ")}
            </p>
          ) : null}
          {reopened.record.watching.length > 0 ? (
            <p className="mt-1 text-fluid-nano leading-5 text-white/45">
              Watching: {reopened.record.watching.join(" · ")}
              {reopened.drift.length > 0
                ? ` — ${reopened.drift.map(formatDriftLabel).join(", ")}`
                : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {saved && !editing ? (
        <div className="mt-3 space-y-1.5">
          <p className="text-fluid-xs leading-5 text-slate-200">
            <span className="font-semibold text-emerald-300">Closed.</span>{" "}
            {saved.changed.length > 0 ? `Changed: ${saved.changed.join(" · ")}.` : "Nothing changed."}
          </p>
          {saved.watching.length > 0 ? (
            <p className="text-fluid-xs leading-5 text-slate-300">Watching: {saved.watching.join(" · ")}.</p>
          ) : null}
          {saved.note ? <p className="text-fluid-xs leading-5 text-slate-400">{saved.note}</p> : null}
          <button
            type="button"
            onClick={handleReopen}
            className="min-h-11 text-fluid-xs font-semibold text-sky-300 underline underline-offset-2 weather-focus-ring"
          >
            Edit this record
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {areaChoices.length > 0 ? (
            <fieldset>
              <legend className="text-fluid-nano type-eyebrow text-white/50">What did you change?</legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {areaChoices.map((area) => (
                  <Chip
                    key={area}
                    label={area}
                    active={changed.includes(area)}
                    onToggle={() => setChanged((list) => toggle(list, area))}
                  />
                ))}
              </div>
            </fieldset>
          ) : null}

          {watchChoices.length > 0 ? (
            <fieldset>
              <legend className="text-fluid-nano type-eyebrow text-white/50">What are you watching?</legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {watchChoices.map((condition) => (
                  <Chip
                    key={condition}
                    label={condition}
                    active={watching.includes(condition)}
                    onToggle={() => setWatching((list) => toggle(list, condition))}
                  />
                ))}
              </div>
            </fieldset>
          ) : null}

          <label className="block">
            <span className="text-fluid-nano type-eyebrow text-white/50">Anything else (optional)</span>
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Revisit the Q4 hiring plan with finance"
              className="mt-1.5 w-full min-h-11 rounded-md border border-white/[0.10] bg-slate-950/50 px-3 py-2 text-fluid-xs text-slate-200 placeholder:text-slate-500 weather-focus-ring"
            />
          </label>

          <button
            type="button"
            onClick={handleClose}
            data-testid="weekly-closeout-save"
            className="weather-button inline-flex min-h-11 items-center justify-center px-4 py-2 text-fluid-xs font-semibold"
          >
            {saved ? "Save changes" : "Close the week"}
          </button>
        </div>
      )}

    </section>
  );
}
