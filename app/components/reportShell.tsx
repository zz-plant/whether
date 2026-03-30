/**
 * Shared report shell layout for Whether Report pages.
 * Keeps header, navigation, and layout consistent across multi-page views.
 */
import Link from "next/link";
import { Children, type ReactNode, isValidElement } from "react";
import type { Route } from "../../lib/navigation/routeType";
import { DisplayGuardian } from "./displayGuardian";
import { DisplayModeManager } from "./displayModeManager";
import { DisplayModeToggle } from "./displayModeToggle";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";
import {
  ReportMobileNavigation,
  ReportSectionNavigation,
  type ReportPageLink,
  type ReportSectionLink,
} from "./reportShellNavigation";
import { type ReportStageItem } from "./reportRevampElements";
import { INFORMATIONAL_NOTICE } from "../../lib/exportNotices";
import { serializeJsonLd } from "../../lib/seo";
import { AnchorFeedback } from "./anchorFeedback";
import { ReportCta } from "./reportCta";

import { ClimateBackdrop } from "./climateBackdrop";
import { RegimeIconType } from "./regimeIcons";
import { ArrowRightIcon } from "./uiIcons";
import { RegimeCommandBar, type RegimeCommandBarProps } from "./RegimeCommandBar";
import { ReportShellHeader, type ReportShellHeaderVariant } from "./reportShellHeader";
import { ManualRefreshButton } from "./manualRefreshButton";
import { resolveTrustReadinessCopy } from "../../lib/report/trustStatus";

type ReportCtaProps = { href: string; label: string; copyText?: string; copyTarget?: string };
type SecondaryCtaProps = { href: string; label: string };
type ExportCtaProps = { href: string; label: string };

const isRouteHref = (href: string) => href.startsWith("/");
const InternalAwareLink = ({
  href,
  className,
  children,
  ariaCurrent,
}: {
  href: string;
  className: string;
  children: ReactNode;
  ariaCurrent?: "page" | "step";
}) => {
  if (isRouteHref(href)) {
    return (
      <Link href={href as Route} className={className} aria-current={ariaCurrent}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={className} aria-current={ariaCurrent}>
      {children}
    </a>
  );
};

type DecisionBanner = {
  label?: string;
  decision: string;
  horizon: string;
  confidence: string;
  confidenceScore?: number;
  effectiveDate: string;
  evidenceHref?: string;
};

type ActionSequence = {
  title: string;
  items: Array<{ title: string; detail: string; href: string; cta: string }>;
};

type RoleSwitcher = {
  active: string;
  options: Array<{ key: string; label: string; href: Route }>;
};

type DecisionDiff = { label: string; tone?: "neutral" | "positive" | "warning" };

type ReportShellInput = {
  statusLabel: string;
  regime?: RegimeIconType;
  recordDateLabel: string;
  fetchedAtLabel: string;
  treasurySource: string;
  pageTitle: string;
  pageSummary: string;
  pageSummaryLink?: { href: string; label: string };
  pageLinks: ReportPageLink[];
  sectionLinks: ReportSectionLink[];
  trustStatusLabel: string;
  trustStatusDetail: string;
  trustStatusAction: string;
  trustStatusTone: "stable" | "warning" | "historical";
  outageType?: "live-data" | "feed-unavailable" | "stale-cache" | "source-divergence" | "historical-snapshot";
  outageSeverity?: "advisory" | "blocking" | "critical";
  decisionImpactWindow?: string;
  approvalBuckets?: Array<{ label: string; detail: string }>;
  recoveryPlan?: { owner: string; nextCheckpoint: string; exitCondition: string };
  outageExitGate?: { label: string; summary: string; metCount: number; totalCount: number };
  degradedSourceRows?: Array<{ sourceName: string; modeLabel: string; freshnessStatus: string }>;
  showOfflineBadge?: boolean;
  offlineBadgeLabel?: string;
  heroVariant?: "full" | "compact";
  pageNavVariant?: "full" | "compact";
  showPageNavigation?: boolean;
  headerVariant?: ReportShellHeaderVariant;
  sidebarVariant?: "full" | "hidden";
  hideHeroChrome?: boolean;
  primaryCta?: ReportCtaProps;
  secondaryCta?: SecondaryCtaProps;
  exportCta?: ExportCtaProps | null;
  structuredData?: unknown;
  historicalBanner?: ReactNode;
  currentPath: string;
  stageRail?: {
    title?: string;
    items: ReportStageItem[];
  };
  decisionBanner?: DecisionBanner;
  actionSequence?: ActionSequence;
  roleSwitcher?: RoleSwitcher;
  decisionDiffs?: DecisionDiff[];
  nextStep?: { description: string; href: string };
  nextRefreshLabel?: string;
  inlineTrustPlacement?: "before-content" | "after-first-section";
  provenance?: DataProvenance;
  commandBar?: RegimeCommandBarProps;
  ambientMode?: "standard" | "tv";
};

type ReportShellModel = {
  status: Pick<ReportShellInput, "statusLabel" | "regime" | "recordDateLabel" | "fetchedAtLabel" | "treasurySource">;
  page: Pick<ReportShellInput, "pageTitle" | "pageSummary" | "pageSummaryLink" | "pageLinks" | "sectionLinks" | "currentPath">;
  trust: Pick<ReportShellInput, "trustStatusLabel" | "trustStatusDetail" | "trustStatusAction" | "trustStatusTone" | "outageType" | "outageSeverity" | "decisionImpactWindow" | "approvalBuckets" | "recoveryPlan" | "outageExitGate" | "degradedSourceRows" | "showOfflineBadge" | "offlineBadgeLabel" | "inlineTrustPlacement" | "provenance">;
  chrome?: Pick<ReportShellInput, "heroVariant" | "pageNavVariant" | "showPageNavigation" | "headerVariant" | "sidebarVariant" | "hideHeroChrome" | "ambientMode">;
  actions?: Pick<ReportShellInput, "primaryCta" | "secondaryCta" | "exportCta" | "nextStep" | "nextRefreshLabel">;
  payloads?: Pick<ReportShellInput, "structuredData" | "historicalBanner" | "stageRail" | "decisionBanner" | "actionSequence" | "roleSwitcher" | "decisionDiffs" | "commandBar">;
};

type ReportShellProps = { children: ReactNode } & (
  | ({ model: ReportShellModel } & { [K in keyof ReportShellInput]?: never })
  | ({ model?: never } & ReportShellInput)
);

export const resolveTrustProvenance = ({
  provenance,
  sourceLabel,
  sourceHref,
  degradedSourceRows,
}: {
  provenance?: DataProvenance;
  sourceLabel: string;
  sourceHref?: string;
  degradedSourceRows?: Array<{ sourceName: string; modeLabel: string; freshnessStatus: string }>;
}): DataProvenance | undefined => {
  if (!provenance) {
    return undefined;
  }

  const hasDegradedSourceRows = Boolean(degradedSourceRows && degradedSourceRows.length > 0);
  const shouldDowngradeLiveLabel = hasDegradedSourceRows && provenance.statusLabel === "Live (high confidence)";

  return {
    ...provenance,
    sourceLabel,
    sourceUrl: sourceHref ?? provenance.sourceUrl,
    statusLabel: shouldDowngradeLiveLabel ? "Cached (medium)" : provenance.statusLabel,
  };
};

const trustPanelToneClass: Record<"stable" | "warning" | "historical", string> = {
  stable: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100",
  warning: "border-amber-400/40 bg-amber-500/10 text-amber-100",
  historical: "border-slate-500/45 bg-slate-800/60 text-slate-200",
};

const sourceReadinessScore = (modeLabel: string, freshnessStatus: string) => {
  const mode = modeLabel.toLowerCase();
  const freshness = freshnessStatus.toLowerCase();
  let score = mode.includes("live") ? 100 : mode.includes("snapshot") ? 62 : 38;
  if (freshness.includes("stale")) score -= 22;
  if (freshness.includes("degraded")) score -= 26;
  return Math.max(18, Math.min(100, score));
};

export function HeroTrustProvenanceBlock({
  trustStatusTone,
  trustStatusLabel,
  trustStatusDetail,
  trustStatusAction,
  outageType,
  outageSeverity,
  decisionImpactWindow,
  approvalBuckets,
  recoveryPlan,
  outageExitGate,
  degradedSourceRows,
  statusLabel,
  fetchedAtLabel,
  resolvedNextRefreshLabel,
  sourceLabel,
  sourceHref,
  provenance,
}: {
  trustStatusTone: "stable" | "warning" | "historical";
  trustStatusLabel: string;
  trustStatusDetail: string;
  trustStatusAction: string;
  outageType?: ReportShellProps["outageType"];
  outageSeverity?: ReportShellProps["outageSeverity"];
  decisionImpactWindow?: string;
  approvalBuckets?: ReportShellProps["approvalBuckets"];
  recoveryPlan?: ReportShellProps["recoveryPlan"];
  outageExitGate?: ReportShellProps["outageExitGate"];
  degradedSourceRows?: ReportShellProps["degradedSourceRows"];
  statusLabel: string;
  fetchedAtLabel: string;
  resolvedNextRefreshLabel: string;
  sourceLabel: string;
  sourceHref?: string;
  provenance?: DataProvenance;
}) {
  const trustProvenance = resolveTrustProvenance({ provenance, sourceLabel, sourceHref, degradedSourceRows });
  const trustReadiness = resolveTrustReadinessCopy({
    trustStatusTone,
    degradedSourceRows,
  });
  const hasDegradedSourceRows = Boolean(degradedSourceRows && degradedSourceRows.length > 0);
  const isCompactStableState = trustReadiness.tone === "stable" && !outageSeverity && !hasDegradedSourceRows;
  const trustToneClass = trustPanelToneClass[trustReadiness.tone];
  const controlHeadline = trustStatusLabel;
  const trustStatusDetailForDisplay = trustReadiness.tone === "warning"
    ? "Decision impact: keep the do now / hold / revisit path, but do not treat this as a clear read until freshness and confidence recover."
    : trustStatusDetail;
  const trustStatusActionForDisplay = trustReadiness.tone === "warning"
    ? "Pause irreversible approvals until one verified live refresh lands."
    : trustStatusAction;
  const currentApprovalLane = approvalBuckets?.[0];
  const secondaryApprovalLanes = approvalBuckets?.slice(1, 3) ?? [];
  const exitProgressPercent = outageExitGate
    ? Math.max(8, Math.min(100, (outageExitGate.metCount / Math.max(1, outageExitGate.totalCount)) * 100))
    : 100;

  return (
    <>
      <section className="weather-panel flex flex-col gap-3 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex min-h-[28px] items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${trustToneClass}`}>
              {controlHeadline}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Data trust</span>
          </div>
          {outageSeverity ? (
            <span className={`inline-flex min-h-[28px] items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
              outageSeverity === "critical"
                ? "border-rose-400/45 bg-rose-500/10 text-rose-100"
                : outageSeverity === "blocking"
                  ? "border-amber-400/45 bg-amber-500/10 text-amber-100"
                  : "border-emerald-400/35 bg-emerald-500/10 text-emerald-100"
            }`}>
              {outageSeverity} · {(outageType ?? "live-data").replaceAll("-", " ")}
            </span>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Current readiness</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">{controlHeadline}</p>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <p>Data refreshed {fetchedAtLabel}</p>
              <p>Next refresh {resolvedNextRefreshLabel}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-200">{trustStatusActionForDisplay}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{trustStatusDetailForDisplay}</p>
          {decisionImpactWindow ? <p className="mt-1 text-xs leading-5 text-slate-400">{decisionImpactWindow}</p> : null}
        </div>

        {isCompactStableState ? (
          <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Trust summary</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">Standard approval cadence is available.</p>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${trustToneClass}`}>
                Allowed now
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              Inputs are fresh enough for this week&apos;s decision. Open more detail only if someone questions freshness or source coverage.
            </p>
          </div>
        ) : (
        <div className="grid gap-3">
          <article className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Approval status</p>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${trustToneClass}`}>
                {currentApprovalLane?.label ?? "Allowed now"}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-100">{currentApprovalLane?.detail ?? trustStatusDetailForDisplay}</p>
            {secondaryApprovalLanes.length > 0 ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {secondaryApprovalLanes.map((lane) => (
                  <div key={lane.label} className="rounded-lg border border-slate-700/60 bg-slate-950/55 px-2.5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{lane.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">{lane.detail}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </article>

          <article className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Recovery progress</p>
              <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                {outageExitGate ? `${outageExitGate.metCount}/${outageExitGate.totalCount} clear` : "Stable"}
              </span>
            </div>
            {outageExitGate ? (
              <>
                <div className="mt-2 h-2 rounded-full bg-slate-800/90">
                  <div className="h-2 rounded-full bg-gradient-to-r from-amber-300 via-sky-300 to-emerald-300" style={{ width: `${exitProgressPercent}%` }} />
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-300">{outageExitGate.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{outageExitGate.summary}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-300">{trustReadiness.tone === "warning" ? "No active recovery sequence, but trust stays on watch until the next verified live refresh." : "No active recovery sequence. Live trust controls are clear."}</p>
            )}
            {recoveryPlan ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-700/60 bg-slate-950/55 px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Owner</p>
                  <p className="mt-1 text-xs text-slate-100">{recoveryPlan.owner}</p>
                </div>
                <div className="rounded-lg border border-slate-700/60 bg-slate-950/55 px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Checkpoint</p>
                  <p className="mt-1 text-xs text-slate-100">{recoveryPlan.nextCheckpoint}</p>
                </div>
                <div className="rounded-lg border border-slate-700/60 bg-slate-950/55 px-2.5 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">Exit</p>
                  <p className="mt-1 text-xs text-slate-100">{recoveryPlan.exitCondition}</p>
                </div>
              </div>
            ) : null}
          </article>

          <article className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Source status</p>
              <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">
                {(degradedSourceRows?.length ?? 0) > 0 ? `${degradedSourceRows?.length} degraded` : "All core feeds live"}
              </span>
            </div>
            {(degradedSourceRows && degradedSourceRows.length > 0) ? (
              <ul className="mt-3 space-y-2">
                {degradedSourceRows.slice(0, 4).map((row) => {
                  const score = sourceReadinessScore(row.modeLabel, row.freshnessStatus);
                  return (
                    <li key={`${row.sourceName}-${row.modeLabel}`} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-100">{row.sourceName}</span>
                        <span className="text-slate-400">{row.modeLabel} · {row.freshnessStatus}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800/90">
                        <div className="h-2 rounded-full bg-gradient-to-r from-rose-300 via-amber-300 to-sky-300" style={{ width: `${score}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-300">No degraded source rows this refresh. Core sources are usable for standard approval cadence.</p>
            )}
          </article>
        </div>
        )}

        <details className="weather-auto-chevron rounded-xl border border-slate-700/70 bg-slate-950/55 px-3 py-2">
          <summary className="min-h-[44px] cursor-pointer list-none pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
            Data source details
          </summary>
          <div className="mt-2">
            {trustProvenance ? (
              <DataProvenanceStrip provenance={trustProvenance} variant="compact" />
            ) : (
              <dl className="grid gap-2 text-xs text-slate-300">
                <div className="flex items-center justify-between gap-3"><dt className="text-slate-400">Posture</dt><dd className="font-semibold text-slate-100">{statusLabel}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-slate-400">Confidence</dt><dd className="text-slate-200">{controlHeadline}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-slate-400">Data refreshed</dt><dd className="text-slate-200">{fetchedAtLabel}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-slate-400">Next refresh</dt><dd className="text-slate-200">{resolvedNextRefreshLabel}</dd></div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-slate-400">Source</dt>
                  <dd className="text-right text-slate-200">
                    <span>{sourceLabel}</span>
                    {sourceHref ? (
                      <a href={sourceHref} target="_blank" rel="noreferrer" className="ml-2 text-sky-200 underline decoration-slate-500/80 underline-offset-2 hover:text-slate-100">View source</a>
                    ) : null}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </details>
      </section>
      <p className="mt-3 text-xs text-slate-300">Keep the decision path moving; for methodology details, see <Link href="/method" className="underline decoration-slate-500/80 underline-offset-2">/method</Link>.</p>
    </>
  );
}

export function CommandCenterNavBlock({
  heroVariant,
  pageTitle,
  pageSummary,
  summaryLink,
  recordDateLabel,
  roleSwitcher,
  primaryCta,
  secondaryCta,
  exportCta,
  nextStep,
  statusLabel,
  trustStatusLabel,
  fetchedAtLabel,
  resolvedNextRefreshLabel,
  trustStatusAction,
  showOfflineBadge,
  offlineBadgeLabel,
  decisionBanner,
  missionSupportText,
  decisionDiffs,
  missionSequenceTitle,
  missionSequenceItems,
}: {
  heroVariant: "full" | "compact";
  pageTitle: string;
  pageSummary: string;
  summaryLink: ReactNode;
  recordDateLabel: string;
  roleSwitcher?: RoleSwitcher;
  primaryCta?: ReportCtaProps;
  secondaryCta?: SecondaryCtaProps;
  exportCta?: ExportCtaProps | null;
  nextStep?: { description: string; href: string };
  statusLabel: string;
  trustStatusLabel: string;
  fetchedAtLabel: string;
  resolvedNextRefreshLabel: string;
  trustStatusAction: string;
  showOfflineBadge: boolean;
  offlineBadgeLabel: string;
  decisionBanner?: DecisionBanner;
  missionSupportText: string;
  decisionDiffs?: DecisionDiff[];
  missionSequenceTitle: string;
  missionSequenceItems: Array<{ title: string; detail: string; href: string; cta: string; phase: string }>;
}) {
  const primaryDecisionText = decisionBanner?.decision ?? (primaryCta ? `${primaryCta.label}.` : "Review the current operating posture.");
  return (
    <>
      <section className="weather-panel-static min-w-0 space-y-3 px-4 py-4 sm:space-y-4 sm:px-5">
        <div className="space-y-3">
          {roleSwitcher ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-[0.1em] text-slate-400">Role view</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {roleSwitcher.options.map((option) => {
                  const isActive = option.key === roleSwitcher.active;
                  return <InternalAwareLink key={option.key} href={option.href} ariaCurrent={isActive ? "page" : undefined} className={`weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-sm font-semibold tracking-[0.08em] ${isActive ? "border-sky-300/80 text-slate-100" : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"}`}>{option.label}</InternalAwareLink>;
                })}
              </div>
            </div>
          ) : null}
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-400 sm:tracking-[0.18em]">Whether report</p>
          <h1 className={heroVariant === "compact" ? "text-2xl font-semibold text-slate-100 sm:text-3xl" : "type-headline text-slate-100"}>{pageTitle}</h1>
          <p className="flex max-w-2xl flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-relaxed text-slate-200 sm:text-base"><span>{pageSummary}</span>{summaryLink}</p>
          {heroVariant === "full" ? <span className="sr-only">Evidence stamped {recordDateLabel}</span> : null}
        </div>

        {primaryCta ? (
          <div id="report-primary-actions" className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">On this page</p>
            <div className="flex w-full min-w-0">
              <ReportCta href={primaryCta.href} copyText={primaryCta.copyText} copyTarget={primaryCta.copyTarget} label={primaryCta.label} className="weather-cta weather-cta-primary w-full max-w-full text-center sm:w-auto"><span className="max-w-full break-words text-center">{primaryCta.label}</span></ReportCta>
            </div>
          </div>
        ) : null}
        {secondaryCta || nextStep || exportCta ? (
          <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400">
            Elsewhere:
            {secondaryCta ? (
              <>
                {" "}
                <InternalAwareLink href={secondaryCta.href} className="text-sky-200 underline decoration-slate-500/80 underline-offset-4">{secondaryCta.label}</InternalAwareLink>
              </>
            ) : null}
            {nextStep ? (
              <>
                {secondaryCta ? <span className="mx-1 text-slate-500">•</span> : " "}
                <InternalAwareLink href={nextStep.href} className="text-sky-200 underline decoration-slate-500/80 underline-offset-4">{nextStep.description}</InternalAwareLink>
              </>
            ) : null}
            {exportCta ? (
              <>
                {secondaryCta || nextStep ? <span className="mx-1 text-slate-500">•</span> : " "}
                <InternalAwareLink href={exportCta.href} className="text-sky-200 underline decoration-slate-500/80 underline-offset-4">{exportCta.label}</InternalAwareLink>
              </>
            ) : null}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <dl className="weather-surface weather-meta-list min-h-[40px] flex-1 px-3 py-2 text-[11px] font-semibold tracking-[0.06em] text-slate-100" aria-label="Current report status">
            <div className="weather-meta-list__item"><dt className="text-slate-400">Posture</dt><dd>{statusLabel}</dd></div>
            <div className="weather-meta-list__item"><dt className="text-slate-400">Confidence</dt><dd>{trustStatusLabel}</dd></div>
            <div className="weather-meta-list__item"><dt className="text-slate-400">Data refreshed</dt><dd>{fetchedAtLabel}</dd></div>
            <div className="weather-meta-list__item"><dt className="text-slate-400">Next refresh</dt><dd>{resolvedNextRefreshLabel}</dd></div>
          </dl>
          <ManualRefreshButton title="Request the latest weekly brief snapshot." />
        </div>
        <p className="text-xs leading-relaxed text-slate-300">{trustStatusAction}</p>
        {showOfflineBadge ? <p className="weather-chip inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.14em] text-amber-100">{offlineBadgeLabel}</p> : null}
      </section>

      <section className="weather-panel space-y-4 px-4 py-5 sm:px-5" aria-label="Decision snapshot">
        <div className="grid gap-3 lg:grid-cols-[1.6fr,1.4fr]">
          <article className="weather-surface space-y-3 border-sky-400/25 bg-sky-500/8 p-4">
            <p className="text-sm font-semibold tracking-[0.12em] text-slate-400">{decisionBanner?.label ?? "Decide now"}</p>
            <h2 className="text-xl font-semibold text-slate-100 sm:text-[1.45rem]">{primaryDecisionText}</h2>
            <p className="text-sm text-slate-300">{missionSupportText}</p>
            {decisionDiffs?.length ? <ul className="mt-2 flex flex-wrap gap-2" aria-label="Decision deltas">{decisionDiffs.map((item) => <li key={item.label} className="inline-flex min-h-[28px] items-center rounded-full border border-slate-700/80 bg-slate-900/60 px-2 py-1 text-[11px] font-semibold tracking-[0.12em] text-slate-200">{item.label}</li>)}</ul> : null}
            {decisionBanner?.evidenceHref ? <InternalAwareLink href={decisionBanner.evidenceHref} className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.14em] text-sky-200 underline">See supporting evidence<ArrowRightIcon className="ml-1 h-3.5 w-3.5" /></InternalAwareLink> : null}
          </article>
          <article className="weather-surface space-y-3 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{missionSequenceTitle}</p>
            <ol className="space-y-2">{missionSequenceItems.map((item) => <li key={item.title} className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3"><p className="text-xs font-semibold tracking-[0.1em] text-slate-400">{item.phase}</p><p className="mt-1 text-sm font-semibold text-slate-100">{item.title}</p><p className="mt-1 text-xs text-slate-300">{item.detail}</p></li>)}</ol>
          </article>
        </div>
      </section>
    </>
  );
}

export function SidebarSequenceBlock({ stageRail }: { stageRail?: { title?: string; items: ReportStageItem[] } }) {
  if (!stageRail) return null;
  return (
    <section className="weather-panel space-y-3 px-4 py-4 sm:px-5" aria-label={stageRail.title ?? "Decision flow"}>
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-400">{stageRail.title ?? "Decision flow"}</p>
      <ol className="grid gap-2 md:grid-cols-5">
        {stageRail.items.map((item, index) => (
          <li key={item.id}>
            <InternalAwareLink href={item.href} className="weather-pill inline-flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200" ariaCurrent={item.status === "current" ? "step" : undefined}>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">{index + 1}</span>
              <span>{item.label}</span>
            </InternalAwareLink>
          </li>
        ))}
      </ol>
    </section>
  );
}

const normalizeReportShellInput = (props: ReportShellProps): ReportShellInput => {
  if ("model" in props && props.model) {
    const { model } = props;
    return {
      ...model.status,
      ...model.page,
      ...model.trust,
      ...model.chrome,
      ...model.actions,
      ...model.payloads,
    };
  }

  return props;
};

export const ReportShell = (props: ReportShellProps) => {
  const { children } = props;
  const input = normalizeReportShellInput(props);
  const {
    statusLabel: resolvedStatusLabel,
    regime: resolvedRegime,
    recordDateLabel: resolvedRecordDateLabel,
    fetchedAtLabel: resolvedFetchedAtLabel,
    treasurySource: resolvedTreasurySource,
    pageTitle: resolvedPageTitle,
    pageSummary: resolvedPageSummary,
    pageSummaryLink: resolvedPageSummaryLink,
    pageLinks: resolvedPageLinks,
    sectionLinks: resolvedSectionLinks,
    currentPath: resolvedCurrentPath,
    trustStatusDetail: resolvedTrustStatusDetail,
    trustStatusAction: resolvedTrustStatusAction,
    trustStatusTone: resolvedTrustStatusTone,
    outageType: resolvedOutageType,
    outageSeverity: resolvedOutageSeverity,
    decisionImpactWindow: resolvedDecisionImpactWindow,
    approvalBuckets: resolvedApprovalBuckets,
    recoveryPlan: resolvedRecoveryPlan,
    outageExitGate: resolvedOutageExitGate,
    degradedSourceRows: resolvedDegradedSourceRows,
    showOfflineBadge: resolvedShowOfflineBadge = false,
    offlineBadgeLabel: resolvedOfflineBadgeLabel = "Cached snapshot",
    heroVariant: resolvedHeroVariant = "full",
    pageNavVariant: resolvedPageNavVariant = "full",
    showPageNavigation: resolvedShowPageNavigation = false,
    headerVariant: resolvedHeaderVariantInput,
    sidebarVariant: resolvedSidebarVariant = "full",
    hideHeroChrome: resolvedHideHeroChrome = false,
    primaryCta: resolvedPrimaryCta = { href: "#weekly-action-summary", label: "This week" },
    secondaryCta: resolvedSecondaryCta,
    exportCta: resolvedExportCta = { href: "/operations#ops-export-briefs", label: "Generate executive brief" },
    structuredData: resolvedStructuredData,
    historicalBanner: resolvedHistoricalBanner,
    stageRail: resolvedStageRail,
    decisionBanner: resolvedDecisionBanner,
    actionSequence: resolvedActionSequence,
    roleSwitcher: resolvedRoleSwitcher,
    decisionDiffs: resolvedDecisionDiffs,
    nextStep: resolvedNextStep,
    nextRefreshLabel,
    inlineTrustPlacement: resolvedInlineTrustPlacement = "before-content",
    provenance: resolvedProvenance,
    commandBar: resolvedCommandBar,
    ambientMode: resolvedAmbientMode = "standard",
  } = input;
  const resolvedNextRefreshLabel = nextRefreshLabel ?? (resolvedTrustStatusTone === "historical" ? "Fixed historical snapshot" : "15m cadence");
  const contentSections = Children.toArray(children);
  const summaryLink = resolvedPageSummaryLink ? <InternalAwareLink href={resolvedPageSummaryLink.href} className="inline-flex min-h-[44px] items-center text-xs font-semibold text-sky-200 underline decoration-slate-500/80 underline-offset-4">{resolvedPageSummaryLink.label}</InternalAwareLink> : null;
  const hasSidebar = resolvedSidebarVariant === "full";
  const missionSequenceLabels = ["Now", "Next", "Later"];
  const missionSequenceTitle = resolvedActionSequence?.title ?? "Plan";
  const missionSequenceItems = (resolvedActionSequence?.items ?? []).slice(0, 3).map((item, index) => ({ ...item, phase: missionSequenceLabels[index] ?? `Step ${index + 1}` }));
  const sourceHref = resolvedTreasurySource.startsWith("http") ? resolvedTreasurySource : undefined;
  const sourceLabel = sourceHref ? (() => { try { const hostname = new URL(sourceHref).hostname.replace(/^www\./, ""); if (hostname.includes("stlouisfed.org")) return "FRED"; if (hostname.includes("fiscaldata.treasury.gov")) return "Treasury Fiscal Data"; return hostname; } catch { return resolvedTreasurySource; } })() : resolvedTreasurySource;
  const showPostureRibbon = resolvedCurrentPath !== "/";
  const resolvedHeaderVariant: ReportShellHeaderVariant = resolvedHeaderVariantInput ?? (resolvedHideHeroChrome ? "home-brief" : "standard");
  const isPrimaryActionInSectionLinks = resolvedPrimaryCta ? resolvedSectionLinks.some((section) => section.href === resolvedPrimaryCta.href) : false;
  const showMobileActionCard = Boolean(resolvedPrimaryCta) && !isPrimaryActionInSectionLinks;
  const showInlineTrustBlock = !hasSidebar;
  const renderTrustBeforeContent = showInlineTrustBlock && resolvedInlineTrustPlacement === "before-content";
  const renderTrustAfterFirstSection = showInlineTrustBlock && resolvedInlineTrustPlacement === "after-first-section";
  const enableTvAmbientMode = resolvedAmbientMode === "tv";
  const trustReadiness = resolveTrustReadinessCopy({
    trustStatusTone: resolvedTrustStatusTone,
    degradedSourceRows: resolvedDegradedSourceRows,
  });
  const maxSectionNavItemsDesktop = 4;
  const maxSectionNavItemsMobile = 4;
  const controlHeadline = trustReadiness.headline;
  const trustStatusDetailForDisplay = trustReadiness.tone === "warning"
    ? "Decision impact: keep the do now / hold / revisit path, but do not treat this as a clear read until freshness and confidence recover."
    : resolvedTrustStatusDetail;
  const trustStatusActionForDisplay = trustReadiness.tone === "warning"
    ? "Pause irreversible approvals until one verified live refresh lands."
    : resolvedTrustStatusAction;
  const decisionSnapshotAction = resolvedCommandBar?.doNow[0]?.trim() ?? "";
  const decisionSnapshotFlip = resolvedCommandBar?.flipConditions[0]?.trim() ?? "";

  return (
    <>
      <main id="main-content" tabIndex={-1} className="weather-shell relative isolate min-h-screen overflow-x-clip text-slate-100">
        <ClimateBackdrop regime={resolvedRegime || "NEUTRAL"} />
        {resolvedStructuredData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(resolvedStructuredData) }} /> : null}
        {enableTvAmbientMode ? <DisplayModeManager /> : null}
        {enableTvAmbientMode ? <AnchorFeedback /> : null}
        {enableTvAmbientMode ? <DisplayGuardian /> : null}
        <div className="tv-rail-safe relative z-10 mx-auto max-w-[88rem] pb-[calc(env(safe-area-inset-bottom)+10rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] pl-[calc(env(safe-area-inset-left)+1rem)] pr-[calc(env(safe-area-inset-right)+1rem)] sm:pb-10 sm:pt-5 sm:pl-[calc(env(safe-area-inset-left)+1.25rem)] sm:pr-[calc(env(safe-area-inset-right)+1.25rem)]">
          <ReportShellHeader
            variant={resolvedHeaderVariant}
            statusLabel={resolvedStatusLabel}
            fetchedAtLabel={resolvedFetchedAtLabel}
            recordDateLabel={resolvedRecordDateLabel}
            currentPath={resolvedCurrentPath}
            showPageNavigation={resolvedShowPageNavigation}
            pageLinks={resolvedPageLinks}
            pageTitle={resolvedPageTitle}
            pageNavVariant={resolvedPageNavVariant}
          />
          {resolvedCommandBar ? (
            <section
              className="sticky top-1 z-30 mt-3 rounded-xl border border-slate-700/60 bg-slate-950/82 px-3 py-2 sm:top-2 sm:px-3.5"
              aria-label="Decision snapshot"
            >
              <div className="grid gap-1.5 text-[11px] leading-5 text-slate-200 sm:grid-cols-3">
                <p className="rounded-md border border-slate-700/70 bg-slate-950/70 px-2.5 py-1.5">
                  <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300">Posture</span>
                  <span className="font-semibold text-slate-50">{resolvedCommandBar.postureLabel ?? resolvedStatusLabel}</span>
                </p>
                <p className="rounded-md border border-slate-700/70 bg-slate-950/70 px-2.5 py-1.5">
                  <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-200">Action</span>
                  <span className="font-medium text-slate-100">{decisionSnapshotAction || "Hold this week’s approved posture actions."}</span>
                </p>
                <p className="rounded-md border border-slate-700/70 bg-slate-950/70 px-2.5 py-1.5">
                  <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-200">Flip trigger</span>
                  <span className="font-medium text-slate-100">{decisionSnapshotFlip || "Re-open posture if primary trigger confirms."}</span>
                </p>
              </div>
            </section>
          ) : null}

          {showPostureRibbon ? <div className="weather-panel-static mb-4 hidden flex-wrap items-center justify-between gap-2 border border-slate-700/70 px-4 py-2 text-xs sm:flex"><p className="text-slate-300">Current Posture: <span className="font-semibold text-slate-100">{resolvedStatusLabel}</span><span className="ml-2 text-slate-400">Decision as-of {resolvedRecordDateLabel}</span></p><Link href="/" className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-[11px] font-semibold tracking-[0.14em]">Open weekly brief</Link></div> : null}
          {resolvedHistoricalBanner}
          {resolvedCommandBar ? <div className="mt-4"><RegimeCommandBar {...resolvedCommandBar} /></div> : null}

          <div className={`mt-5 grid min-w-0 gap-5 xl:gap-6 ${hasSidebar ? "xl:grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)] xl:items-start" : ""}`}>
            {hasSidebar ? (
              <aside className="order-2 space-y-4 xl:order-none xl:col-start-2 xl:row-start-1 xl:sticky xl:top-28 xl:self-start">
                {resolvedSectionLinks.length ? (
                  <ReportSectionNavigation
                    sectionLinks={resolvedSectionLinks}
                    className="hidden xl:block"
                    maxItems={maxSectionNavItemsDesktop}
                  />
                ) : null}
                <HeroTrustProvenanceBlock
                  trustStatusTone={trustReadiness.tone}
                  trustStatusLabel={controlHeadline}
                  trustStatusDetail={trustStatusDetailForDisplay}
                  trustStatusAction={trustStatusActionForDisplay}
                  outageType={resolvedOutageType}
                  outageSeverity={resolvedOutageSeverity}
                  decisionImpactWindow={resolvedDecisionImpactWindow}
                  approvalBuckets={resolvedApprovalBuckets}
                  recoveryPlan={resolvedRecoveryPlan}
                  outageExitGate={resolvedOutageExitGate}
                  degradedSourceRows={resolvedDegradedSourceRows}
                  statusLabel={resolvedStatusLabel}
                  fetchedAtLabel={resolvedFetchedAtLabel}
                  resolvedNextRefreshLabel={resolvedNextRefreshLabel}
                  sourceLabel={sourceLabel}
                  sourceHref={sourceHref}
                  provenance={resolvedProvenance}
                />
              </aside>
            ) : null}

            <div className={`order-1 min-w-0 space-y-8 lg:space-y-10 xl:order-none xl:col-start-1 xl:row-start-1 ${hasSidebar ? "" : "mx-auto w-full max-w-[78rem]"}`}>
              {!resolvedHideHeroChrome ? <CommandCenterNavBlock heroVariant={resolvedHeroVariant} pageTitle={resolvedPageTitle} pageSummary={resolvedPageSummary} summaryLink={summaryLink} recordDateLabel={resolvedRecordDateLabel} roleSwitcher={resolvedRoleSwitcher} primaryCta={resolvedPrimaryCta} secondaryCta={resolvedSecondaryCta} exportCta={resolvedExportCta} nextStep={resolvedNextStep} statusLabel={resolvedStatusLabel} trustStatusLabel={controlHeadline} fetchedAtLabel={resolvedFetchedAtLabel} resolvedNextRefreshLabel={resolvedNextRefreshLabel} trustStatusAction={trustStatusActionForDisplay} showOfflineBadge={resolvedShowOfflineBadge} offlineBadgeLabel={resolvedOfflineBadgeLabel} decisionBanner={resolvedDecisionBanner} missionSupportText={trustStatusDetailForDisplay} decisionDiffs={resolvedDecisionDiffs} missionSequenceTitle={missionSequenceTitle} missionSequenceItems={missionSequenceItems} /> : null}

              <SidebarSequenceBlock stageRail={resolvedStageRail} />

              {renderTrustBeforeContent ? <section className="space-y-4"><div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"><HeroTrustProvenanceBlock trustStatusTone={trustReadiness.tone} trustStatusLabel={controlHeadline} trustStatusDetail={trustStatusDetailForDisplay} trustStatusAction={trustStatusActionForDisplay} outageType={resolvedOutageType} outageSeverity={resolvedOutageSeverity} decisionImpactWindow={resolvedDecisionImpactWindow} approvalBuckets={resolvedApprovalBuckets} recoveryPlan={resolvedRecoveryPlan} outageExitGate={resolvedOutageExitGate} degradedSourceRows={resolvedDegradedSourceRows} statusLabel={resolvedStatusLabel} fetchedAtLabel={resolvedFetchedAtLabel} resolvedNextRefreshLabel={resolvedNextRefreshLabel} sourceLabel={sourceLabel} sourceHref={sourceHref} provenance={resolvedProvenance} /></div></section> : null}

              <div className="space-y-10 lg:space-y-12">{contentSections.map((section, index) => { const sectionKey = isValidElement(section) && section.key != null ? section.key : `section-${index}`; return <div key={sectionKey} className={index === 0 ? "" : "border-t border-slate-800/70 pt-10 lg:pt-12"}>{section}{renderTrustAfterFirstSection && index === 0 ? <section className="mt-4 space-y-4"><div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"><HeroTrustProvenanceBlock trustStatusTone={trustReadiness.tone} trustStatusLabel={controlHeadline} trustStatusDetail={trustStatusDetailForDisplay} trustStatusAction={trustStatusActionForDisplay} outageType={resolvedOutageType} outageSeverity={resolvedOutageSeverity} decisionImpactWindow={resolvedDecisionImpactWindow} approvalBuckets={resolvedApprovalBuckets} recoveryPlan={resolvedRecoveryPlan} outageExitGate={resolvedOutageExitGate} degradedSourceRows={resolvedDegradedSourceRows} statusLabel={resolvedStatusLabel} fetchedAtLabel={resolvedFetchedAtLabel} resolvedNextRefreshLabel={resolvedNextRefreshLabel} sourceLabel={sourceLabel} sourceHref={sourceHref} provenance={resolvedProvenance} /></div></section> : null}</div>; })}</div>

              <footer className="mt-12 border-t border-slate-800/70 pt-6 text-xs font-semibold tracking-[0.18em] text-slate-300">
                <p>{INFORMATIONAL_NOTICE}</p>
              </footer>
            </div>
          </div>
        </div>

        {showMobileActionCard && resolvedPrimaryCta ? <div className="sm:hidden mt-6 px-4"><section className="weather-panel border-sky-500/40 bg-slate-950/95 px-3 py-3"><p className="text-[11px] font-semibold tracking-[0.14em] text-slate-300">Current posture</p><div className="mt-2 flex items-center justify-between gap-3"><p className="max-w-[16rem] text-xs font-semibold text-slate-100">{resolvedDecisionBanner?.decision ?? `${resolvedPrimaryCta.label}.`}</p><ReportCta href={resolvedPrimaryCta.href} copyText={resolvedPrimaryCta.copyText} copyTarget={resolvedPrimaryCta.copyTarget} label={resolvedPrimaryCta.label} className="weather-button-primary inline-flex min-h-[44px] flex-shrink-0 items-center justify-center rounded-full px-3 py-2 text-xs font-semibold tracking-[0.14em]">{resolvedPrimaryCta.label}</ReportCta></div></section></div> : null}

        {resolvedShowPageNavigation ? <div className="sm:hidden"><ReportMobileNavigation pageLinks={resolvedPageLinks} pageTitle={resolvedPageTitle} currentPath={resolvedCurrentPath} className="mt-3 px-4 pb-6" sectionLinks={resolvedSectionLinks} maxItems={maxSectionNavItemsMobile} /></div> : null}

        {enableTvAmbientMode && resolvedPrimaryCta ? <aside className="tv-action-rail" aria-label="TV quick actions"><p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Quick actions</p><div className="mt-2 grid gap-2"><ReportCta href={resolvedPrimaryCta.href} copyText={resolvedPrimaryCta.copyText} copyTarget={resolvedPrimaryCta.copyTarget} label={resolvedPrimaryCta.label} className="weather-button-primary inline-flex min-h-[56px] items-center justify-center px-4 py-2 text-center text-sm font-semibold tracking-[0.12em] text-slate-100">{resolvedPrimaryCta.label}</ReportCta>{resolvedSecondaryCta ? <InternalAwareLink href={resolvedSecondaryCta.href} className="weather-pill inline-flex min-h-[56px] items-center justify-center px-4 py-2 text-center text-sm font-semibold tracking-[0.12em] text-slate-200">{resolvedSecondaryCta.label}</InternalAwareLink> : null}<DisplayModeToggle /></div></aside> : null}
      </main>
    </>
  );
};
