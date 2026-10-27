"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { CheckIcon, CopyIcon } from "./uiIcons";
import { ClipboardActionRow } from "./clipboardActionRow";
import { isTypingTarget } from "./KeyboardShortcuts";
import { useBriefArtifact } from "./useBriefArtifact";
import { useClipboardCopy } from "./useClipboardCopy";
import { briefConditionEntries, formatBriefArtifact } from "../../lib/report/briefArtifact";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { SignalReading } from "./ui/plainLanguage";

/**
 * The brief as three frames, for the meeting it gets read in.
 *
 * The control for this already existed and already said "Presentation focus
 * mode": it restyled `[data-home-shell-main]` to a narrower column with a
 * shadow, which is a reading mode, not a presentation. A room looking at a
 * shared screen needs the call at a size it can read from the back, then the
 * decisions that reopen, then what would flip it — in that order, one at a
 * time, without the presenter scrolling past everything else on the page.
 *
 * The frames read the published artifact island rather than taking props, for
 * the same reason the share panel does: the trigger lives in the global header,
 * outside the route that holds the brief. It is the same object the copy
 * formats use, so the summary at the end cannot drift from what is on screen.
 */

const FRAME_TITLES = ["The guidance", "Decisions to revisit", DECISION_CONTRACT_LABELS.watch.flipWatch] as const;

export function PresentationFrames({ onExit }: { onExit: () => void }) {
  const artifact = useBriefArtifact();
  const [frame, setFrame] = useState(0);
  const { copyToClipboard, status } = useClipboardCopy({ commitment: "copied_meeting" });

  const summary = useMemo(
    () => (artifact ? formatBriefArtifact(artifact, "slack", window.location.origin) : ""),
    [artifact],
  );

  const goNext = useCallback(() => setFrame((value) => Math.min(value + 1, FRAME_TITLES.length - 1)), []);
  const goPrev = useCallback(() => setFrame((value) => Math.max(value - 1, 0)), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      // The dialog moves focus inside itself on open, so every key arrives with a
      // control as its target. Space and Enter belong to that control; only the
      // arrows drive the sequence.
      const onControl = target?.closest("button, a");

      if (isTypingTarget(target)) return;

      if (event.key === "ArrowRight" || (!onControl && (event.key === " " || event.key === "Enter"))) {
        event.preventDefault();
        goNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrev();
      }
    };

    /*
     * Capture phase, deliberately. The dialog owns focus while it is open and
     * settles key events on its own container, so a bubble-phase listener on
     * `window` never saw the arrow keys — the sequence advertised "← → to move"
     * and only the on-screen buttons worked.
     */
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [goNext, goPrev]);

  /*
   * Nothing to present on a route with no weekly call. The controller still
   * restyles the page behind this, which is the reading mode it always was.
   */
  if (!artifact) return null;

  const revisit = artifact.revisit ?? [];
  // Same list the copy formats print, so the frame and the paste agree.
  const conditions = briefConditionEntries(artifact);

  const isLast = frame === FRAME_TITLES.length - 1;

  return (
    <Dialog.Root open onOpenChange={(next) => { if (!next) onExit(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-slate-950/95 backdrop-blur-sm" />
        <Dialog.Popup
          className="fixed inset-0 z-[61] flex flex-col justify-between p-6 sm:p-12"
          aria-label="Brief presentation"
        >
          <div className="flex items-baseline justify-between gap-4 text-fluid-xs text-white/50">
            <span className="type-eyebrow">{artifact.title} · {artifact.recordDateLabel}</span>
            <span className="tabular-nums" aria-hidden="true">
              {frame + 1} / {FRAME_TITLES.length}
            </span>
          </div>

          {/* One live region for the whole sequence: advancing a frame replaces
              the content rather than adding a second thing to announce. */}
          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center py-8" aria-live="polite">
            <p className="type-eyebrow">{FRAME_TITLES[frame]}</p>

            {frame === 0 ? (
              <div className="mt-4 space-y-6">
                <p className="text-[clamp(1.75rem,5vw,3.25rem)] font-semibold leading-[1.15] tracking-[-0.015em] text-white">
                  {artifact.call}
                </p>
                {artifact.actionNow && artifact.actionNow.trim() !== artifact.call.trim() ? (
                  <p className="text-[clamp(1rem,2.2vw,1.5rem)] leading-snug text-slate-300">
                    <span className="text-emerald-300/80">{DECISION_CONTRACT_LABELS.action.doNow}:</span>{" "}
                    {artifact.actionNow}
                  </p>
                ) : null}
                {/* Each score with its meaning: a room reading "64/100" off a
                    shared screen cannot tell which end is bad. */}
                <p className="text-fluid-sm text-white/50">
                  {artifact.regimeLabel} · <SignalReading signalKey="tightness" score={artifact.tightness} />
                  {typeof artifact.riskAppetite === "number" ? (
                    <>
                      {" · "}
                      <SignalReading signalKey="riskAppetite" score={artifact.riskAppetite} />
                    </>
                  ) : null}
                </p>
              </div>
            ) : null}

            {frame === 1 ? (
              <div className="mt-4 space-y-5">
                {revisit.length === 0 ? (
                  <p className="text-[clamp(1.5rem,4vw,2.5rem)] font-semibold leading-tight text-white">
                    Nothing reopens this week.
                  </p>
                ) : (
                  <ol className="space-y-5">
                    {revisit.map((item) => (
                      <li key={item.label}>
                        <p className="text-[clamp(1.25rem,3vw,2rem)] font-semibold leading-tight text-white">
                          {item.label}
                        </p>
                        <p className="mt-1 text-[clamp(0.95rem,1.8vw,1.25rem)] leading-snug text-slate-300">
                          {item.recheck}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
                {artifact.noChangeAreas && artifact.noChangeAreas.length > 0 ? (
                  <p className="border-t border-[color:var(--border-subtle)] pt-4 text-fluid-sm text-white/45">
                    Unchanged: {artifact.noChangeAreas.join(" · ")}
                  </p>
                ) : null}
              </div>
            ) : null}

            {frame === 2 ? (
              <div className="mt-4 space-y-5">
                {conditions.length === 0 ? (
                  <p className="text-[clamp(1.5rem,4vw,2.5rem)] font-semibold leading-tight text-white">
                    No bounded condition is published for this week.
                  </p>
                ) : (
                  <dl className="space-y-5">
                    {conditions.map((entry) => (
                      <div key={entry.label}>
                        <dt className="type-eyebrow text-white/50">{entry.label}</dt>
                        <dd className="mt-1 text-[clamp(1.15rem,2.8vw,1.85rem)] font-medium leading-snug text-white">
                          {entry.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-fluid-nano text-white/35">
              ← → to move · Esc to exit · Source: {artifact.source}
            </p>
            <div className="flex items-center gap-2">
              {/* The summary is offered on the last frame, where the meeting ends
                  and someone has to paste the decision somewhere. It is the same
                  Slack block the share panel produces. */}
              {isLast ? (
                <ClipboardActionRow
                  label="Copy summary"
                  state={status}
                  onClick={() => { void copyToClipboard(summary, "presentation"); }}
                  leadingIcon={<CopyIcon />}
                  stateIcons={{ copied: <CheckIcon /> }}
                  buttonLabels={{ copied: "Summary copied" }}
                  buttonClassName="text-fluid-xs"
                  buttonProps={{ "data-testid": "presentation-copy-summary" }}
                />
              ) : null}
              <button
                type="button"
                onClick={goPrev}
                disabled={frame === 0}
                className="weather-button inline-flex min-h-11 min-w-11 items-center justify-center px-4 py-2 text-fluid-xs font-semibold disabled:opacity-30"
              >
                Back
              </button>
              <button
                type="button"
                onClick={isLast ? onExit : goNext}
                className="weather-button inline-flex min-h-11 items-center justify-center px-4 py-2 text-fluid-xs font-semibold"
              >
                {isLast ? "Done" : "Next"}
              </button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
