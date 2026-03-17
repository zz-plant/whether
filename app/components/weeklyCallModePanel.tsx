"use client";

import { Dialog } from "@base-ui/react/dialog";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { StartupVariantMode } from "../../lib/report/boundedDecisionRules";
import type { StartupVariantPolicy } from "../../lib/report/homeBriefModel";
import { homeSectionSequence } from "../../lib/report/homeSections";
import {
  ForecastConditionsHeader,
  ForecastStatsGrid,
  ForecastStrip,
  type ForecastStripCardData,
} from "./forecastStrip";
import type { StartupModeContent } from "./startupModeSelector";

const callSectionHref = homeSectionSequence[0]?.href ?? "#weekly-posture-brief-title";
const auditSectionHref = homeSectionSequence[1]?.href ?? "#audit-this-call";
const executionSectionHref = homeSectionSequence[2]?.href ?? "#approve-this-weeks-plan";
const historicalReplaySectionHref = homeSectionSequence[3]?.href ?? "#historical-replay-workspace";
const toolsSectionHref = homeSectionSequence[4]?.href ?? "#translate-or-run-tool";

type WeeklyCallModePanelProps = {
  startupVariantPolicy: StartupVariantPolicy;
  modeContentByMode: Partial<Record<StartupVariantMode, StartupModeContent>>;
  postureLabel: string;
  operatingCall: string;
  trendLabel: string;
  confidencePercent: number;
  confidenceLabel: "HIGH" | "MED" | "LOW";
  snapshotDoNow: string;
  snapshotAvoid: string;
  snapshotWatch: string;
  effectiveFlipLabels: string[];
  compactInsetClassName: string;
  tierOnePanelClassName: string;
  sectionSpacingClassName: string;
  tierOneHeadingClassName: string;
  whyItMattersLine?: string;
  readThisCardItems?: Array<{
    label: string;
    detail: string;
  }>;
  glossaryHref?: string;
  trustCueLine?: string;
  needsTrustWarning?: boolean;
  trustWarningCopy?: string;
};

const commandActions = [
  { label: "Jump: This week's call", href: callSectionHref, type: "Section" },
  { label: "Jump: Audit this call", href: auditSectionHref, type: "Section" },
  { label: "Jump: Historical replay", href: historicalReplaySectionHref, type: "Section" },
  { label: "Jump: Approve this week's plan", href: executionSectionHref, type: "Section" },
  { label: "Jump: Translate or run a tool", href: toolsSectionHref, type: "Section" },
  { label: "Open Signals", href: "/signals", type: "Page" },
  { label: "Open Operations", href: "/operations", type: "Page" },
  { label: "Open Decide", href: "/decide", type: "Page" },
] as const;

export function WeeklyCallModePanel({
  startupVariantPolicy,
  modeContentByMode,
  postureLabel,
  operatingCall,
  trendLabel,
  confidencePercent,
  confidenceLabel,
  snapshotDoNow,
  snapshotAvoid,
  snapshotWatch,
  effectiveFlipLabels,
  compactInsetClassName,
  tierOnePanelClassName,
  sectionSpacingClassName,
  tierOneHeadingClassName,
  whyItMattersLine,
  readThisCardItems = [],
  glossaryHref,
  trustCueLine,
  needsTrustWarning = false,
  trustWarningCopy,
}: WeeklyCallModePanelProps) {
  const firstAvailableMode = startupVariantPolicy.options.find((option) => modeContentByMode[option.mode])?.mode;
  const [activeMode, setActiveMode] = useState<StartupVariantMode>(startupVariantPolicy.selectedMode);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");

  const effectiveMode = modeContentByMode[activeMode]
    ? activeMode
    : (modeContentByMode[startupVariantPolicy.selectedMode] ? startupVariantPolicy.selectedMode : firstAvailableMode);
  const activeContent = effectiveMode ? modeContentByMode[effectiveMode] : undefined;
  const selectedModeLabel = startupVariantPolicy.options.find((option) => option.mode === effectiveMode)?.label;

  const modeAdjustedSnapshot = useMemo(() => ({
    doNow: activeContent?.doNowBullets[0] ?? snapshotDoNow,
    avoid: activeContent?.avoidBullets[0] ?? snapshotAvoid,
    watch: activeContent?.watchBullets[0] ?? snapshotWatch,
  }), [activeContent, snapshotAvoid, snapshotDoNow, snapshotWatch]);

  const confidenceValue = Math.max(0, Math.min(100, Math.round(confidencePercent)));
  const confidenceToneClass = confidenceLabel === "HIGH"
    ? "bg-emerald-400/80"
    : confidenceLabel === "MED"
      ? "bg-amber-400/80"
      : "bg-rose-400/80";
  const heroUrgencyClass = confidenceLabel === "LOW"
    ? "weather-live-hero weather-live-hero--high"
    : confidenceLabel === "MED"
      ? "weather-live-hero weather-live-hero--medium"
      : "weather-live-hero weather-live-hero--low";
  const stageSummary = selectedModeLabel ?? "Default";
  const followUpFlipLabels = effectiveFlipLabels
    .filter((label) => label.trim().length > 0 && label.trim() !== modeAdjustedSnapshot.watch.trim())
    .slice(0, 2);
  const forecastCards: ForecastStripCardData[] = [
    {
      id: "outlook",
      label: "Outlook",
      headline: operatingCall,
      supportingText: postureLabel,
    },
    {
      id: "do-now",
      label: "Do now",
      headline: modeAdjustedSnapshot.doNow,
      tone: "positive",
    },
    {
      id: "guardrail",
      label: "Guardrail",
      headline: modeAdjustedSnapshot.avoid,
      tone: "warning",
    },
    {
      id: "flip-watch",
      label: "Flip watch",
      headline: modeAdjustedSnapshot.watch,
      tone: "info",
      chips: followUpFlipLabels.map((label) => ({ label, tone: "info" })),
      footerText: followUpFlipLabels.length > 0
        ? undefined
        : "Primary trigger before new fixed-cost commitments.",
    },
  ];

  const filteredCommandActions = commandActions.filter((action) =>
    `${action.label} ${action.type}`.toLowerCase().includes(commandQuery.trim().toLowerCase())
  );


  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCommandShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isCommandShortcut) {
        return;
      }

      event.preventDefault();
      setCommandOpen(true);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <article className={`rounded-[1.2rem] border border-slate-700/75 bg-slate-950/92 p-3.5 sm:p-4 ${heroUrgencyClass}`} aria-label="Weekly call snapshot">
        <ForecastConditionsHeader
          eyebrow="Current conditions"
          headline="This week in one screen"
          description="Decide here, then open the audit trail only if the call needs evidence."
          chips={[
            { label: "Operator forecast", tone: "info" },
            { label: postureLabel },
            { label: trendLabel },
          ]}
          trailing={(
            <ForecastStatsGrid
              stats={[
                { label: "Confidence", value: `${confidenceValue}%` },
                { label: "Stage view", value: stageSummary },
                { label: "Signal state", value: confidenceLabel },
              ]}
              className="lg:min-w-[22rem]"
            />
          )}
        />
        {whyItMattersLine ? (
          <p className="mt-2.5 max-w-3xl text-xs leading-5 text-slate-200">{whyItMattersLine}</p>
        ) : null}
        <ForecastStrip cards={forecastCards} ariaLabel="Weekly decision transmission order" className="mt-3" />
        {readThisCardItems.length > 0 ? (
          <details className="mt-3 rounded-lg border border-slate-700/60 bg-slate-950/55 px-3 py-2.5">
            <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">Decode this forecast</summary>
            <ul className="mt-2 grid gap-1.5 text-[11px] text-slate-100">
              {readThisCardItems.slice(0, 3).map((item) => (
                <li key={item.label} className="rounded-md border border-slate-700/55 bg-slate-900/55 px-2.5 py-2">
                  <span className="font-semibold text-slate-200">{item.label}:</span> {item.detail}
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-300">
              <span className={compactInsetClassName}>Capital tightness = how hard funding is to access.</span>
              <span className={compactInsetClassName}>Risk appetite = how much the market will support bold expansion.</span>
              <span className={compactInsetClassName}>Flip condition = the threshold that changes this week&apos;s call.</span>
            </div>
            {glossaryHref ? (
              <Link href={glossaryHref} className="mt-2 inline-flex min-h-[44px] items-center text-xs font-semibold text-sky-300 underline underline-offset-2">
                Open glossary help
              </Link>
            ) : null}
          </details>
        ) : null}
        <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(13rem,0.85fr)]">
          {trustCueLine ? (
            <div className={`rounded-lg border px-3 py-2.5 text-[11px] ${needsTrustWarning ? "border-amber-400/35 bg-amber-500/10 text-amber-50" : "border-slate-700/60 bg-slate-950/55 text-slate-200"}`}>
              <p className="font-semibold uppercase tracking-[0.12em]">{needsTrustWarning ? "Can I rely on this?" : "Trust check"}</p>
              <p className="mt-1 leading-5">{needsTrustWarning ? trustWarningCopy ?? trustCueLine : trustCueLine}</p>
            </div>
          ) : null}
          <div className="rounded-lg border border-slate-700/60 bg-slate-950/55 px-3 py-2.5" aria-label="Decision confidence gauge">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">Decision confidence</p>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800/90" role="progressbar" aria-valuenow={confidenceValue} aria-valuemin={0} aria-valuemax={100} aria-label={`Confidence ${confidenceValue} percent`}>
              <div className={`h-full origin-left ${confidenceToneClass} transition-transform duration-300`} style={{ transform: `scaleX(${confidenceValue / 100})` }} />
            </div>
            <p className="mt-1 text-[10px] text-slate-300">{confidenceValue}% confidence · watch the flip cues when this compresses.</p>
          </div>
        </div>
      </article>

      <article id="weekly-call-core" className={`${tierOnePanelClassName} weather-motion-card ${sectionSpacingClassName} bg-gradient-to-br from-slate-950/95 via-slate-900/85 to-slate-950/95`}>
        <h2 className={tierOneHeadingClassName}>This week&apos;s call</h2>
        <div className="grid gap-2 text-xs text-slate-100 md:grid-cols-2">
          <p className={compactInsetClassName}><span className="font-semibold uppercase tracking-[0.08em] text-slate-200">What environment?</span> {postureLabel} with a {trendLabel.toLowerCase()} trend at {confidenceValue}% confidence.</p>
          <p className={compactInsetClassName}><span className="font-semibold uppercase tracking-[0.08em] text-emerald-200">DO NOW</span> {modeAdjustedSnapshot.doNow}</p>
          <p className={compactInsetClassName}><span className="font-semibold uppercase tracking-[0.08em] text-rose-200">GUARDRAIL</span> {modeAdjustedSnapshot.avoid}</p>
          <p className={compactInsetClassName}><span className="font-semibold uppercase tracking-[0.08em] text-sky-200">FLIP WHEN</span> {modeAdjustedSnapshot.watch}</p>
        </div>

        <div className="rounded-lg border border-slate-800/55 bg-slate-950/62 px-3 py-2.5">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">Stage view</p>
                <span className="rounded-full border border-slate-700/70 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-200">
                  {stageSummary}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {startupVariantPolicy.options.map((option) => {
                  const selected = option.mode === effectiveMode;
                  return (
                    <button
                      key={option.mode}
                      type="button"
                      onClick={() => setActiveMode(option.mode)}
                      className={`min-h-[44px] rounded-full border px-3 py-2 text-xs font-semibold tracking-[0.06em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation ${
                        selected
                          ? "border-sky-400/70 bg-sky-500/20 text-sky-100"
                          : "border-slate-700/70 bg-slate-950/70 text-slate-300 hover:border-slate-500/80"
                      }`}
                      aria-pressed={selected}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {activeContent ? (
                <p className="mt-2 text-[11px] leading-5 text-slate-300">
                  {activeContent.description} Threshold emphasis: {activeContent.thresholdEmphasis}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-left text-xs font-semibold tracking-[0.06em] text-slate-200 transition hover:border-slate-500/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 sm:min-w-[14rem]"
            >
              <span>Open command palette</span>
              <span aria-hidden="true" className="text-sm">⌘K / Ctrl+K</span>
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-300">Mode-adjusted call is live above. Use command palette only to jump between sections.</p>
        </div>
      </article>

      <Dialog.Root open={commandOpen} onOpenChange={setCommandOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-slate-950/70" />
          <Dialog.Popup className="fixed inset-x-4 top-1/2 z-50 mx-auto w-full max-w-xl -translate-y-1/2 rounded-2xl border border-slate-700/80 bg-slate-950/98 p-4 shadow-2xl">
            <Dialog.Title className="text-sm font-semibold tracking-[0.08em] text-slate-100">Command palette</Dialog.Title>
            <Dialog.Description className="mt-1 text-xs text-slate-300">Jump directly to decision sections or adjacent report pages.</Dialog.Description>
            <input
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.target.value)}
              placeholder="Search commands..."
              className="mt-3 min-h-[44px] w-full rounded-md border border-slate-700/80 bg-slate-950/80 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            />
            <ul className="mt-3 max-h-64 space-y-2 overflow-auto">
              {filteredCommandActions.map((action) => (
                <li key={action.href}>
                  {action.href.startsWith("/") ? (
                    <Link
                      href={action.href}
                      onClick={() => setCommandOpen(false)}
                      className="inline-flex min-h-[44px] w-full items-center justify-between rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-left text-xs font-semibold tracking-[0.08em] text-slate-100 hover:border-sky-400/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                    >
                      <span>{action.label}</span>
                      <span className="text-[10px] uppercase text-slate-400">{action.type}</span>
                    </Link>
                  ) : (
                    <a
                      href={action.href}
                      onClick={() => setCommandOpen(false)}
                      className="inline-flex min-h-[44px] w-full items-center justify-between rounded-md border border-slate-700/70 bg-slate-950/70 px-3 py-2 text-left text-xs font-semibold tracking-[0.08em] text-slate-100 hover:border-sky-400/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
                    >
                      <span>{action.label}</span>
                      <span className="text-[10px] uppercase text-slate-400">{action.type}</span>
                    </a>
                  )}
                </li>
              ))}
              {filteredCommandActions.length === 0 ? <li className="text-xs text-slate-400">No command matches your search.</li> : null}
            </ul>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
