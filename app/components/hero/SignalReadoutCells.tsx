import { REGIME_DESCRIPTOR } from "../../viewModel";
import { DECISION_CONTRACT_LABELS } from "../../../lib/report/reportCopy";
import { RegimeGlyph } from "../illustrations/RegimeGlyph";
import { ThresholdLadder } from "../illustrations/ThresholdLadder";
import { DeltaGlyph } from "../illustrations/DeltaGlyph";
import { trendDirectionFromDelta, trendToneClass } from "../illustrations/TrendGlyph";
import type { RegimeKey } from "../../../lib/types";
import { PlainEnglishScoreNote } from "../ui/plainLanguage";
import { compositeSignalScales } from "../../../lib/report/signalTranslations";

type SignalReadoutCellsProps = {
  /** Keeps the glyphs' SVG ids unique if the cells are ever rendered twice. */
  idSuffix: string;
  tightness: number;
  tightnessDelta: number;
  tightnessPressure?: number;
  tightnessSaturated?: boolean;
  tightnessLevel: string;
  tightnessLevelColor: string;
  tightnessDeltaMetadataLabel: string;
  tightnessThreshold: number;
  riskAppetite?: number;
  riskAppetiteDelta?: number;
  riskAppetiteLevel?: string;
  riskAppetiteLevelColor?: string;
  riskAppetiteDeltaLabel: string;
  riskAppetiteThreshold: number;
  /** The regime as the model names it; the descriptor table is keyed by that string. */
  regime: string;
  regimeKey?: RegimeKey;
  regimeDisplay: string;
  flipProximity?: string[];
};

/**
 * The three cells behind "Why this call": each composite score against its
 * line, and the conditions word with the flip watch under it. Moved out of
 * `DecisionHero` as-is; the hero derives the band words and delta labels and
 * hands them down so its summary line and these cells read one classification.
 */
export function SignalReadoutCells({
  idSuffix,
  tightness,
  tightnessDelta,
  tightnessPressure,
  tightnessSaturated,
  tightnessLevel,
  tightnessLevelColor,
  tightnessDeltaMetadataLabel,
  tightnessThreshold,
  riskAppetite,
  riskAppetiteDelta,
  riskAppetiteLevel,
  riskAppetiteLevelColor,
  riskAppetiteDeltaLabel,
  riskAppetiteThreshold,
  regime,
  regimeKey,
  regimeDisplay,
  flipProximity,
}: SignalReadoutCellsProps) {
  return (
    <>
      <div className="rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2">
        <p className="text-fluid-nano text-white/40">Funding pressure</p>
        <p className="text-fluid-sm font-semibold tabular-nums text-white/85">
          {tightness}
          <span className="font-normal text-white/35">/100</span>{" "}
          <span className={`text-fluid-nano font-normal ${tightnessLevelColor}`}>{tightnessLevel}</span>
          {tightnessSaturated && typeof tightnessPressure === "number" ? (
            <span
              className="ml-1.5 text-fluid-nano font-normal text-amber-300/80"
              title={`The scale stops at 100. The pressure behind it would read ${tightnessPressure.toFixed(0)}.`}
            >
              · would read {tightnessPressure.toFixed(0)}
            </span>
          ) : null}
        </p>
        {tightnessDelta === 0 && tightnessSaturated ? (
          /*
           * A clipped score cannot move, so the delta row rendered nothing at
           * exactly the moment conditions were most extreme — the reader saw
           * 100/100 and no direction, and had to infer from the ceiling tag
           * beside it that the silence meant "off the top" rather than "flat".
           * Say it. The raw pressure is in the tag; what is missing is that the
           * score has stopped being able to report a move.
           */
          <p className="mt-0.5 text-fluid-nano text-amber-300/70">
            Off the top of the scale. The score can&rsquo;t rise further, so it can&rsquo;t show a move.
          </p>
        ) : tightnessDelta !== 0 ? (
          // The glyph carries its own title/desc ("Rose from 61 to 64"), so it
          // stays exposed to assistive tech rather than sitting behind
          // aria-hidden with only "+3.0 pts" left to announce.
          <p className="mt-0.5 flex items-center gap-1.5 text-fluid-nano">
            <span className="inline-block w-10 shrink-0">
              <DeltaGlyph
                idPrefix={`hero-tightness-delta-${idSuffix}`}
                previous={tightness - tightnessDelta}
                current={tightness}
                min={0}
                max={100}
                label="Funding pressure"
              />
            </span>
            {/* Coloured by this signal's own move. Using the week's overall
                direction here painted a rising tightness emerald whenever the
                headline call happened to be "easing". */}
            <span className={trendToneClass(trendDirectionFromDelta(tightnessDelta), false)}>
              {tightnessDeltaMetadataLabel}
            </span>
          </p>
        ) : null}
        <div className="mt-1.5 w-full">
          <ThresholdLadder
            idPrefix={`hero-tightness-${idSuffix}`}
            min={0}
            max={100}
            current={tightness}
            previous={tightness - tightnessDelta}
            trigger={tightnessThreshold}
            triggerLabel={DECISION_CONTRACT_LABELS.watch.postureFlips}
            viewBoxWidth={220}
            signalLabel="Funding pressure"
            scaleDirection={compositeSignalScales.tightness.directionLabel}
          />
        </div>
        <PlainEnglishScoreNote
          signalKey="tightness"
          score={tightness}
          lead="This signal alone"
          className="mt-1.5"
        />
      </div>

      {typeof riskAppetite === "number" ? (
        <div className="rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2">
          <p className="text-fluid-nano text-white/40">Risk appetite</p>
          <p className="text-fluid-sm font-semibold tabular-nums text-white/85">
            {riskAppetite}
            <span className="font-normal text-white/35">/100</span>{" "}
            <span className={`text-fluid-nano font-normal ${riskAppetiteLevelColor ?? ""}`}>{riskAppetiteLevel ?? ""}</span>
          </p>
          {typeof riskAppetiteDelta === "number" && riskAppetiteDelta !== 0 ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-fluid-nano">
              <span className="inline-block w-10 shrink-0">
                <DeltaGlyph
                  idPrefix={`hero-risk-appetite-delta-${idSuffix}`}
                  previous={riskAppetite - riskAppetiteDelta}
                  current={riskAppetite}
                  min={0}
                  max={100}
                  label="Risk appetite"
                  increaseIsPositive
                />
              </span>
              <span className={trendToneClass(trendDirectionFromDelta(riskAppetiteDelta), true)}>
                {riskAppetiteDeltaLabel}
              </span>
            </p>
          ) : null}
          {/* The pair is meant to be read together, so it gets a single
              encoding. Funding pressure had a rail and risk appetite had a
              sentence, which left two panels claiming to be a pair while showing
              the reader nothing he could compare. Risk appetite trips low, so the
              rail is inverted and both put trouble on the right. */}
          <div className="mt-1.5 w-full">
            <ThresholdLadder
              idPrefix={`hero-risk-appetite-${idSuffix}`}
              min={0}
              max={100}
              current={riskAppetite}
              previous={
                typeof riskAppetiteDelta === "number" ? riskAppetite - riskAppetiteDelta : undefined
              }
              trigger={riskAppetiteThreshold}
              triggerLabel={DECISION_CONTRACT_LABELS.watch.postureFlips}
              viewBoxWidth={220}
              invert
              signalLabel="Risk appetite"
              scaleDirection={compositeSignalScales.riskAppetite.directionLabel}
            />
          </div>
          <PlainEnglishScoreNote
            signalKey="riskAppetite"
            score={riskAppetite}
            lead="This signal alone"
            className="mt-1"
          />
        </div>
      ) : null}

      <div className="col-span-2 rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2 sm:col-span-1">
        <p className="text-fluid-nano text-white/40">Conditions</p>
        <p className="flex items-center gap-1.5 text-fluid-sm font-semibold text-white/85">
          {regimeKey ? (
            <span className="inline-block w-4 shrink-0" aria-hidden="true">
              <RegimeGlyph idPrefix={`hero-regime-${idSuffix}`} regime={regimeKey} />
            </span>
          ) : null}
          {regimeDisplay}
        </p>
        {REGIME_DESCRIPTOR[regime] ? (
          <p className="mt-0.5 text-fluid-nano text-white/45">{REGIME_DESCRIPTOR[regime]}</p>
        ) : null}
        {/* The flip watch: the distance to the boundary in the market's units
            rather than in score points, nearest move first. The rails above
            show how far each score sits from its line; this says what has to
            happen on the curve or the bill for that line to be crossed. */}
        {flipProximity && flipProximity.length > 0 ? (
          <div className="mt-1.5 border-t border-slate-800/60 pt-1.5">
            <p className="text-fluid-nano font-semibold uppercase tracking-[0.08em] text-white/40">
              {DECISION_CONTRACT_LABELS.watch.flipWatch}
            </p>
            <ul className="mt-0.5 space-y-0.5">
              {flipProximity.map((sentence) => (
                <li key={sentence} className="text-fluid-nano leading-snug text-white/60">
                  {sentence}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </>
  );
}
