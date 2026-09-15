import { ShareBriefButton } from "./shareBriefButton";
import { ThresholdLadder } from "./illustrations/ThresholdLadder";
import {
  formatBandHeadroom,
  formatBandReading,
  type CadenceCallModel,
} from "../../lib/report/cadenceCallModel";
import type { HorizonSignalBand } from "../../lib/summary/horizonOperatingRules";
import { DECISION_CONTRACT_LABELS } from "../../lib/report/reportCopy";
import { REGIME_STYLE_TOKENS } from "../../lib/regimePresentation";

/**
 * One signal's position against the two thresholds the sentences above it name.
 *
 * The triad states where the edges are; this states where we are. Without it the pair
 * of sentences reads the same whether funding pressure is parked well clear of the
 * guardrail or one print from it, which is the difference between a policy and a call.
 *
 * Both rails put the guardrail on the right, so risk appetite — which falls into
 * trouble rather than rising into it — runs 100 → 0. The rail labels its own ends.
 */
function BoundedBandRail({ band, idSuffix }: { band: HorizonSignalBand; idSuffix: string }) {
  const { score, delta, towardGuardrail } = formatBandReading(band);

  return (
    <li className="space-y-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="text-fluid-nano text-slate-400">
          {band.label}{" "}
          <span className="font-semibold tabular-nums text-slate-200">{score}</span>
          <span className="text-white/35">/100</span>
          {delta ? (
            <span
              className={`ml-1.5 tabular-nums ${
                towardGuardrail ? "text-semantic-caution-fg" : "text-semantic-easing-fg"
              }`}
            >
              {delta}
            </span>
          ) : null}
        </p>
        <p
          className={`text-fluid-nano tabular-nums ${
            band.pauseTripped || !band.resumeHolds ? "text-semantic-caution-fg" : "text-slate-400"
          }`}
        >
          {formatBandHeadroom(band)}
        </p>
      </div>
      <ThresholdLadder
        idPrefix={`cadence-band-${band.key}-${idSuffix}`}
        min={0}
        max={100}
        current={band.current}
        previous={band.previous ?? undefined}
        trigger={band.pause}
        triggerLabel={DECISION_CONTRACT_LABELS.threshold.guardrail}
        reversal={band.resume}
        invert={band.pauseWhen === "below"}
        hysteresisBand
        viewBoxWidth={660}
        signalLabel={band.label}
        scaleDirection={band.directionLabel}
      />
    </li>
  );
}

/**
 * The lead for a non-weekly cadence. It sits where the weekly call sits and carries the
 * same contract — the call, its guardrail, its reversal — at the selected horizon, then
 * hands off to the weekly hero below it.
 *
 * No nested boxes: §XIII gives elevation to the outermost container, and the run of
 * period chips is a list of controls-sized marks rather than a frame inside the frame.
 */
export function CadenceCallCard({
  model,
  /**
   * `h2` by default. The homepage passes `h1`, because when this card renders
   * the reader has asked for this horizon and its headline is the page's
   * subject — the weekly hero below then takes `h2`.
   */
  titleLevel: TitleTag = "h2",
}: {
  model: CadenceCallModel;
  titleLevel?: "h1" | "h2";
}) {
  const headingId = `${model.horizon}-call-title`;

  return (
    <section className="weather-card space-y-4 p-5 sm:p-7" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-fluid-xs font-medium text-slate-400">
          {model.cadenceLabel}
          {model.periodLabel ? <> · {model.periodLabel}</> : null}
        </p>
        <span
          className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-fluid-nano font-semibold ${REGIME_STYLE_TOKENS[model.regime].badge}`}
        >
          <span className={`size-1.5 rounded-full ${REGIME_STYLE_TOKENS[model.regime].marker}`} />
          {model.regimeLabel}
        </span>
      </div>

      <div className="space-y-2">
        <TitleTag
          id={headingId}
          className="max-w-2xl text-pretty font-sans text-display font-semibold leading-[1.25] tracking-[-0.012em] text-white"
        >
          {model.headline}
        </TitleTag>
        {/* Before the regime description, not after it. Under a refusal the headline is
            the hold and the description is still "capital is cheap" — read in that order
            they contradict, and the sentence that reconciles them arrives too late.
            Zero-offset tint, not a lift: §XIII reserves elevation for the outermost
            container and allows emphasis at depth. */}
        {model.overrideReason ? (
          <p className="rounded-md border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-fluid-nano text-semantic-caution-fg">
            <span className="font-semibold">Posture change held:</span> {model.overrideReason}
          </p>
        ) : null}
        <p className="max-w-2xl text-fluid-sm leading-relaxed text-slate-300">{model.description}</p>
      </div>

      {/* Suppressed under a refusal. The hold's threshold and reversal are horizon-neutral
          and the weekly hero below already carries them, so rendering them here put the
          same two sentences on screen twice. The bridge line hands the reader down to the
          one place the page states that contract. */}
      {model.overrideReason ? null : (
      <dl className="space-y-1.5 text-fluid-nano">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <dt className="shrink-0 rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-fluid-nano font-semibold text-semantic-caution-fg">
            {DECISION_CONTRACT_LABELS.threshold.guardrail}
          </dt>
          <dd className="min-w-0 text-slate-300">{model.boundedRule.threshold}</dd>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <dt className="shrink-0 rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-fluid-nano font-semibold text-semantic-easing-fg">
            {DECISION_CONTRACT_LABELS.reversal.reversal}
          </dt>
          <dd className="min-w-0 text-slate-300">{model.boundedRule.reversal}</dd>
        </div>
      </dl>
      )}

      {/* Sits under the triad, not beside it: the sentences say what the rule is, and
          these say where the rule currently stands. Reading them the other way round
          means meeting four numbers before learning what they gate. */}
      {model.boundedBands.length > 0 ? (
        <ul className="space-y-3">
          {model.boundedBands.map((band) => (
            <BoundedBandRail key={band.key} band={band} idSuffix={model.horizon} />
          ))}
        </ul>
      ) : null}

      {model.history.length > 0 ? (
        <div className="space-y-1.5 border-t border-white/[0.06] pt-3">
          <p className="type-eyebrow text-white/60">{model.historyLabel}</p>
          <ol className="flex flex-wrap items-center gap-1.5">
            {model.history.map((point) => (
              <li
                key={point.label}
                className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-fluid-nano ${
                  point.isCurrent
                    ? `border ${REGIME_STYLE_TOKENS[point.regime].badge} font-semibold`
                    : "text-slate-400"
                }`}
              >
                <span className={`size-1.5 rounded-full ${REGIME_STYLE_TOKENS[point.regime].marker}`} />
                <span>{point.label}</span>
                <span className="sr-only">: {point.regimeLabel}</span>
              </li>
            ))}
          </ol>
          {model.historyDelta ? (
            <p className="text-fluid-nano text-slate-400">{model.historyDelta}</p>
          ) : null}
        </div>
      ) : null}

      {/* One plan CTA per page: the horizon-labelled "Build this …'s plan" lives in the
          weekly block below, where it always has. Two links to /operate under different
          labels would give the reader nothing to choose between. */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
        <p className="text-fluid-nano text-slate-400">{model.weeklyBridge} ↓</p>
        <ShareBriefButton
          title={model.shareTitle}
          text={model.headline}
          lines={model.shareLines}
          label={model.shareLabel}
          copiedLabel={model.shareCopiedLabel}
          showLabel
        />
      </div>
    </section>
  );
}
