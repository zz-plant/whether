/**
 * Shared report shell layout for Whether Report pages.
 * Keeps header, navigation, and layout consistent across multi-page views.
 */
import Link from "next/link";
import { Children, type ReactNode, isValidElement } from "react";
import { DisplayGuardian } from "./displayGuardian";
import { DisplayModeManager } from "./displayModeManager";
import { DisplayModeToggle } from "./displayModeToggle";
import { CanonicalTrustModule } from "./canonicalTrustModule";
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

type ReportCtaProps = { href: string; label: string; copyText?: string; copyTarget?: string };
type SecondaryCtaProps = { href: string; label: string };
type ExportCtaProps = { href: string; label: string };

const isInternalHref = (href: string) => href.startsWith("/") || href.startsWith("#");
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
  if (isInternalHref(href)) {
    return (
      <Link href={href} className={className} aria-current={ariaCurrent}>
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
  options: Array<{ key: string; label: string; href: string }>;
};

type DecisionDiff = { label: string; tone?: "neutral" | "positive" | "warning" };

type ReportShellProps = {
  children: ReactNode;
  model?: ReportShellModel;
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
  status: Pick<ReportShellProps, "statusLabel" | "regime" | "recordDateLabel" | "fetchedAtLabel" | "treasurySource">;
  page: Pick<ReportShellProps, "pageTitle" | "pageSummary" | "pageSummaryLink" | "pageLinks" | "sectionLinks" | "currentPath">;
  trust: Pick<ReportShellProps, "trustStatusLabel" | "trustStatusDetail" | "trustStatusAction" | "trustStatusTone" | "outageType" | "outageSeverity" | "decisionImpactWindow" | "approvalBuckets" | "recoveryPlan" | "outageExitGate" | "degradedSourceRows" | "showOfflineBadge" | "offlineBadgeLabel" | "inlineTrustPlacement" | "provenance">;
  chrome?: Pick<ReportShellProps, "heroVariant" | "pageNavVariant" | "showPageNavigation" | "headerVariant" | "sidebarVariant" | "hideHeroChrome" | "ambientMode">;
  actions?: Pick<ReportShellProps, "primaryCta" | "secondaryCta" | "exportCta" | "nextStep" | "nextRefreshLabel">;
  payloads?: Pick<ReportShellProps, "structuredData" | "historicalBanner" | "stageRail" | "decisionBanner" | "actionSequence" | "roleSwitcher" | "decisionDiffs" | "commandBar">;
};

export const resolveTrustProvenance = ({
  provenance,
  sourceLabel,
  sourceHref,
}: {
  provenance?: DataProvenance;
  sourceLabel: string;
  sourceHref?: string;
}): DataProvenance | undefined => {
  if (!provenance) {
    return undefined;
  }

  return {
    ...provenance,
    sourceLabel,
    sourceUrl: sourceHref ?? provenance.sourceUrl,
  };
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
  const trustProvenance = resolveTrustProvenance({ provenance, sourceLabel, sourceHref });

  return (
    <>
      <CanonicalTrustModule
        tone={trustStatusTone}
        label={trustStatusLabel}
        detail={trustStatusDetail}
        action={trustStatusAction}
        outageType={outageType}
        outageSeverity={outageSeverity}
        decisionImpactWindow={decisionImpactWindow}
        approvalBuckets={approvalBuckets}
        recoveryPlan={recoveryPlan}
        outageExitGate={outageExitGate}
        degradedSourceRows={degradedSourceRows}
        sourceDetails={
          trustProvenance ? (
            <DataProvenanceStrip provenance={trustProvenance} variant="compact" />
          ) : (
            <dl className="grid gap-2 text-xs text-slate-300">
              <div className="flex items-center justify-between gap-3"><dt className="text-slate-400">Posture</dt><dd className="font-semibold text-slate-100">{statusLabel}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-slate-400">Confidence</dt><dd className="text-slate-200">{trustStatusLabel}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-slate-400">Updated</dt><dd className="text-slate-200">{fetchedAtLabel}</dd></div>
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
          )
        }
      />
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
      <section className="weather-panel-static min-w-0 space-y-4 px-4 py-4 sm:space-y-5 sm:px-5">
        <div className="space-y-3 sm:space-y-4">
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
          {heroVariant === "full" ? <span className="sr-only">Signals stamped {recordDateLabel}</span> : null}
        </div>

        {primaryCta || secondaryCta || exportCta ? (
          <div id="report-primary-actions" className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            {primaryCta ? <ReportCta href={primaryCta.href} copyText={primaryCta.copyText} copyTarget={primaryCta.copyTarget} label={primaryCta.label} className="weather-cta weather-cta-primary w-full max-w-full text-center sm:w-auto"><span className="max-w-full break-words text-center">{primaryCta.label}</span></ReportCta> : null}
            {secondaryCta ? <InternalAwareLink href={secondaryCta.href} className="weather-cta weather-cta-secondary w-full sm:w-auto">{secondaryCta.label}</InternalAwareLink> : null}
            {exportCta ? <InternalAwareLink href={exportCta.href} className="weather-cta weather-cta-export w-full sm:w-auto">{exportCta.label}</InternalAwareLink> : null}
          </div>
        ) : null}
        {nextStep ? <p className="text-xs font-semibold tracking-[0.1em] text-slate-300">Next step: <InternalAwareLink href={nextStep.href} className="text-sky-200 underline decoration-slate-500/80 underline-offset-4">{nextStep.description}</InternalAwareLink></p> : null}
        <dl className="weather-surface weather-meta-list min-h-[44px] px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100" aria-label="Current report status">
          <div className="weather-meta-list__item"><dt className="text-slate-400">Posture</dt><dd>{statusLabel}</dd></div>
          <div className="weather-meta-list__item"><dt className="text-slate-400">Confidence</dt><dd>{trustStatusLabel}</dd></div>
          <div className="weather-meta-list__item"><dt className="text-slate-400">Updated</dt><dd>{fetchedAtLabel}</dd></div>
          <div className="weather-meta-list__item"><dt className="text-slate-400">Next refresh</dt><dd>{resolvedNextRefreshLabel}</dd></div>
        </dl>
        <p className="text-sm text-slate-200">{trustStatusAction}</p>
        {showOfflineBadge ? <p className="weather-chip inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.14em] text-amber-100">{offlineBadgeLabel}</p> : null}
      </section>

      <section className="weather-panel space-y-5 px-4 py-5 sm:px-5" aria-label="Mission control">
        <div className="grid gap-3 lg:grid-cols-[1.6fr,1.4fr]">
          <article className="weather-surface space-y-3 p-4">
            <p className="text-sm font-semibold tracking-[0.12em] text-slate-400">{decisionBanner?.label ?? "Decide now"}</p>
            <h2 className="text-lg font-semibold text-slate-100 sm:text-xl">{primaryDecisionText}</h2>
            <p className="text-sm text-slate-300">{missionSupportText}</p>
            {decisionDiffs?.length ? <ul className="mt-2 flex flex-wrap gap-2" aria-label="Decision deltas">{decisionDiffs.map((item) => <li key={item.label} className="inline-flex min-h-[28px] items-center rounded-full border border-slate-700/80 bg-slate-900/60 px-2 py-1 text-[11px] font-semibold tracking-[0.12em] text-slate-200">{item.label}</li>)}</ul> : null}
            {decisionBanner?.evidenceHref ? <InternalAwareLink href={decisionBanner.evidenceHref} className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.14em] text-sky-200 underline">Review evidence trail<ArrowRightIcon className="ml-1 h-3.5 w-3.5" /></InternalAwareLink> : null}
          </article>
          <article className="weather-surface space-y-3 p-4">
            <p className="text-sm font-semibold tracking-[0.12em] text-slate-400">{missionSequenceTitle}</p>
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

export const ReportShell = ({
  children,
  model,
  statusLabel,
  regime,
  recordDateLabel,
  fetchedAtLabel,
  treasurySource,
  pageTitle,
  pageSummary,
  pageSummaryLink,
  pageLinks,
  sectionLinks,
  trustStatusLabel,
  trustStatusDetail,
  trustStatusAction,
  trustStatusTone,
  outageType,
  outageSeverity,
  decisionImpactWindow,
  approvalBuckets,
  recoveryPlan,
  outageExitGate,
  degradedSourceRows,
  showOfflineBadge = false,
  offlineBadgeLabel = "Cached snapshot",
  heroVariant = "full",
  pageNavVariant = "full",
  showPageNavigation = false,
  headerVariant,
  sidebarVariant = "full",
  hideHeroChrome = false,
  primaryCta = { href: "#weekly-action-summary", label: "This week" },
  secondaryCta,
  exportCta = { href: "/operations#ops-export-briefs", label: "Generate executive brief" },
  structuredData,
  historicalBanner,
  currentPath,
  stageRail,
  decisionBanner,
  actionSequence,
  roleSwitcher,
  decisionDiffs,
  nextStep,
  nextRefreshLabel,
  inlineTrustPlacement = "before-content",
  provenance,
  commandBar,
  ambientMode = "standard",
}: ReportShellProps) => {
  const resolvedStatusLabel = model?.status.statusLabel ?? statusLabel;
  const resolvedRegime = model?.status.regime ?? regime;
  const resolvedRecordDateLabel = model?.status.recordDateLabel ?? recordDateLabel;
  const resolvedFetchedAtLabel = model?.status.fetchedAtLabel ?? fetchedAtLabel;
  const resolvedTreasurySource = model?.status.treasurySource ?? treasurySource;
  const resolvedPageTitle = model?.page.pageTitle ?? pageTitle;
  const resolvedPageSummary = model?.page.pageSummary ?? pageSummary;
  const resolvedPageSummaryLink = model?.page.pageSummaryLink ?? pageSummaryLink;
  const resolvedPageLinks = model?.page.pageLinks ?? pageLinks;
  const resolvedSectionLinks = model?.page.sectionLinks ?? sectionLinks;
  const resolvedCurrentPath = model?.page.currentPath ?? currentPath;
  const resolvedTrustStatusLabel = model?.trust.trustStatusLabel ?? trustStatusLabel;
  const resolvedTrustStatusDetail = model?.trust.trustStatusDetail ?? trustStatusDetail;
  const resolvedTrustStatusAction = model?.trust.trustStatusAction ?? trustStatusAction;
  const resolvedTrustStatusTone = model?.trust.trustStatusTone ?? trustStatusTone;
  const resolvedOutageType = model?.trust.outageType ?? outageType;
  const resolvedOutageSeverity = model?.trust.outageSeverity ?? outageSeverity;
  const resolvedDecisionImpactWindow = model?.trust.decisionImpactWindow ?? decisionImpactWindow;
  const resolvedApprovalBuckets = model?.trust.approvalBuckets ?? approvalBuckets;
  const resolvedRecoveryPlan = model?.trust.recoveryPlan ?? recoveryPlan;
  const resolvedOutageExitGate = model?.trust.outageExitGate ?? outageExitGate;
  const resolvedDegradedSourceRows = model?.trust.degradedSourceRows ?? degradedSourceRows;
  const resolvedShowOfflineBadge = model?.trust.showOfflineBadge ?? showOfflineBadge;
  const resolvedOfflineBadgeLabel = model?.trust.offlineBadgeLabel ?? offlineBadgeLabel;
  const resolvedInlineTrustPlacement = model?.trust.inlineTrustPlacement ?? inlineTrustPlacement;
  const resolvedProvenance = model?.trust.provenance ?? provenance;
  const resolvedHeroVariant = model?.chrome?.heroVariant ?? heroVariant;
  const resolvedPageNavVariant = model?.chrome?.pageNavVariant ?? pageNavVariant;
  const resolvedShowPageNavigation = model?.chrome?.showPageNavigation ?? showPageNavigation;
  const resolvedHeaderVariantInput = model?.chrome?.headerVariant ?? headerVariant;
  const resolvedSidebarVariant = model?.chrome?.sidebarVariant ?? sidebarVariant;
  const resolvedHideHeroChrome = model?.chrome?.hideHeroChrome ?? hideHeroChrome;
  const resolvedAmbientMode = model?.chrome?.ambientMode ?? ambientMode;
  const resolvedPrimaryCta = model?.actions?.primaryCta ?? primaryCta;
  const resolvedSecondaryCta = model?.actions?.secondaryCta ?? secondaryCta;
  const resolvedExportCta = model?.actions?.exportCta ?? exportCta;
  const resolvedNextStep = model?.actions?.nextStep ?? nextStep;
  const resolvedNextRefreshLabel = (model?.actions?.nextRefreshLabel ?? nextRefreshLabel)
    ?? (resolvedTrustStatusTone === "historical" ? "Fixed historical snapshot" : "15m cadence");
  const resolvedStructuredData = model?.payloads?.structuredData ?? structuredData;
  const resolvedHistoricalBanner = model?.payloads?.historicalBanner ?? historicalBanner;
  const resolvedStageRail = model?.payloads?.stageRail ?? stageRail;
  const resolvedDecisionBanner = model?.payloads?.decisionBanner ?? decisionBanner;
  const resolvedActionSequence = model?.payloads?.actionSequence ?? actionSequence;
  const resolvedRoleSwitcher = model?.payloads?.roleSwitcher ?? roleSwitcher;
  const resolvedDecisionDiffs = model?.payloads?.decisionDiffs ?? decisionDiffs;
  const resolvedCommandBar = model?.payloads?.commandBar ?? commandBar;
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

          {showPostureRibbon ? <div className="weather-panel-static mb-4 hidden flex-wrap items-center justify-between gap-2 border border-slate-700/70 px-4 py-2 text-xs sm:flex"><p className="text-slate-300">Current Posture: <span className="font-semibold text-slate-100">{resolvedStatusLabel}</span><span className="ml-2 text-slate-400">Updated {resolvedRecordDateLabel}</span></p><Link href="/" className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-[11px] font-semibold tracking-[0.14em]">Open weekly brief</Link></div> : null}
          {resolvedHistoricalBanner}
          {resolvedCommandBar ? <div className="mt-4"><RegimeCommandBar {...resolvedCommandBar} /></div> : null}

          <div className={`mt-5 grid min-w-0 gap-5 xl:gap-6 ${hasSidebar ? "xl:grid-cols-[minmax(0,1fr)_minmax(18rem,20rem)] xl:items-start" : ""}`}>
            {hasSidebar ? <aside className="order-2 space-y-4 xl:order-none xl:col-start-2 xl:row-start-1 xl:sticky xl:top-28 xl:self-start">{resolvedSectionLinks.length ? <ReportSectionNavigation sectionLinks={resolvedSectionLinks} className="hidden xl:block" /> : null}<HeroTrustProvenanceBlock trustStatusTone={resolvedTrustStatusTone} trustStatusLabel={resolvedTrustStatusLabel} trustStatusDetail={resolvedTrustStatusDetail} trustStatusAction={resolvedTrustStatusAction} outageType={resolvedOutageType} outageSeverity={resolvedOutageSeverity} decisionImpactWindow={resolvedDecisionImpactWindow} approvalBuckets={resolvedApprovalBuckets} recoveryPlan={resolvedRecoveryPlan} outageExitGate={resolvedOutageExitGate} degradedSourceRows={resolvedDegradedSourceRows} statusLabel={resolvedStatusLabel} fetchedAtLabel={resolvedFetchedAtLabel} resolvedNextRefreshLabel={resolvedNextRefreshLabel} sourceLabel={sourceLabel} sourceHref={sourceHref} provenance={resolvedProvenance} /></aside> : null}

            <div className={`order-1 min-w-0 space-y-8 lg:space-y-10 xl:order-none xl:col-start-1 xl:row-start-1 ${hasSidebar ? "" : "mx-auto w-full max-w-[78rem]"}`}>
              {!resolvedHideHeroChrome ? <CommandCenterNavBlock heroVariant={resolvedHeroVariant} pageTitle={resolvedPageTitle} pageSummary={resolvedPageSummary} summaryLink={summaryLink} recordDateLabel={resolvedRecordDateLabel} roleSwitcher={resolvedRoleSwitcher} primaryCta={resolvedPrimaryCta} secondaryCta={resolvedSecondaryCta} exportCta={resolvedExportCta} nextStep={resolvedNextStep} statusLabel={resolvedStatusLabel} trustStatusLabel={resolvedTrustStatusLabel} fetchedAtLabel={resolvedFetchedAtLabel} resolvedNextRefreshLabel={resolvedNextRefreshLabel} trustStatusAction={resolvedTrustStatusAction} showOfflineBadge={resolvedShowOfflineBadge} offlineBadgeLabel={resolvedOfflineBadgeLabel} decisionBanner={resolvedDecisionBanner} missionSupportText={resolvedTrustStatusDetail} decisionDiffs={resolvedDecisionDiffs} missionSequenceTitle={missionSequenceTitle} missionSequenceItems={missionSequenceItems} /> : null}

              <SidebarSequenceBlock stageRail={resolvedStageRail} />

              {renderTrustBeforeContent ? <section className="space-y-4"><div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"><HeroTrustProvenanceBlock trustStatusTone={resolvedTrustStatusTone} trustStatusLabel={resolvedTrustStatusLabel} trustStatusDetail={resolvedTrustStatusDetail} trustStatusAction={resolvedTrustStatusAction} outageType={resolvedOutageType} outageSeverity={resolvedOutageSeverity} decisionImpactWindow={resolvedDecisionImpactWindow} approvalBuckets={resolvedApprovalBuckets} recoveryPlan={resolvedRecoveryPlan} outageExitGate={resolvedOutageExitGate} degradedSourceRows={resolvedDegradedSourceRows} statusLabel={resolvedStatusLabel} fetchedAtLabel={resolvedFetchedAtLabel} resolvedNextRefreshLabel={resolvedNextRefreshLabel} sourceLabel={sourceLabel} sourceHref={sourceHref} provenance={resolvedProvenance} /></div></section> : null}

              <div className="space-y-10 lg:space-y-12">{contentSections.map((section, index) => { const sectionKey = isValidElement(section) && section.key != null ? section.key : `section-${index}`; return <div key={sectionKey} className={index === 0 ? "" : "border-t border-slate-800/70 pt-10 lg:pt-12"}>{section}{renderTrustAfterFirstSection && index === 0 ? <section className="mt-4 space-y-4"><div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"><HeroTrustProvenanceBlock trustStatusTone={resolvedTrustStatusTone} trustStatusLabel={resolvedTrustStatusLabel} trustStatusDetail={resolvedTrustStatusDetail} trustStatusAction={resolvedTrustStatusAction} outageType={resolvedOutageType} outageSeverity={resolvedOutageSeverity} decisionImpactWindow={resolvedDecisionImpactWindow} approvalBuckets={resolvedApprovalBuckets} recoveryPlan={resolvedRecoveryPlan} outageExitGate={resolvedOutageExitGate} degradedSourceRows={resolvedDegradedSourceRows} statusLabel={resolvedStatusLabel} fetchedAtLabel={resolvedFetchedAtLabel} resolvedNextRefreshLabel={resolvedNextRefreshLabel} sourceLabel={sourceLabel} sourceHref={sourceHref} provenance={resolvedProvenance} /></div></section> : null}</div>; })}</div>

              <footer className="mt-12 border-t border-slate-800/70 pt-6 text-xs font-semibold tracking-[0.18em] text-slate-300">
                <p>{INFORMATIONAL_NOTICE}</p>
              </footer>
            </div>
          </div>
        </div>

        {showMobileActionCard && resolvedPrimaryCta ? <div className="sm:hidden mt-6 px-4"><section className="weather-panel border-sky-500/40 bg-slate-950/95 px-3 py-3"><p className="text-[11px] font-semibold tracking-[0.14em] text-slate-300">Current posture</p><div className="mt-2 flex items-center justify-between gap-3"><p className="max-w-[16rem] text-xs font-semibold text-slate-100">{decisionBanner?.decision ?? `${resolvedPrimaryCta.label}.`}</p><ReportCta href={resolvedPrimaryCta.href} copyText={resolvedPrimaryCta.copyText} copyTarget={resolvedPrimaryCta.copyTarget} label={resolvedPrimaryCta.label} className="weather-button-primary inline-flex min-h-[44px] flex-shrink-0 items-center justify-center rounded-full px-3 py-2 text-xs font-semibold tracking-[0.14em]">{resolvedPrimaryCta.label}</ReportCta></div></section></div> : null}

        {resolvedShowPageNavigation ? <div className="sm:hidden"><ReportMobileNavigation pageLinks={resolvedPageLinks} pageTitle={resolvedPageTitle} currentPath={resolvedCurrentPath} className="mt-3 px-4 pb-6" sectionLinks={resolvedSectionLinks} /></div> : null}

        {enableTvAmbientMode && resolvedPrimaryCta ? <aside className="tv-action-rail" aria-label="TV quick actions"><p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Quick actions</p><div className="mt-2 grid gap-2"><ReportCta href={resolvedPrimaryCta.href} copyText={resolvedPrimaryCta.copyText} copyTarget={resolvedPrimaryCta.copyTarget} label={resolvedPrimaryCta.label} className="weather-button-primary inline-flex min-h-[56px] items-center justify-center px-4 py-2 text-center text-sm font-semibold tracking-[0.12em] text-slate-100">{resolvedPrimaryCta.label}</ReportCta>{resolvedSecondaryCta ? <InternalAwareLink href={resolvedSecondaryCta.href} className="weather-pill inline-flex min-h-[56px] items-center justify-center px-4 py-2 text-center text-sm font-semibold tracking-[0.12em] text-slate-200">{resolvedSecondaryCta.label}</InternalAwareLink> : null}<DisplayModeToggle /></div></aside> : null}
      </main>
    </>
  );
};
