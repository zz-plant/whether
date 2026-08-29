/**
 * Shared report shell layout for Whether Weekly Brief pages.
 * Keeps header, navigation, and layout consistent across multi-page views.
 *
 * Uses PageShell for the outer container structure so hub and report pages
 * share consistent page-level padding, backdrop, and ambient behavior.
 */
import { Children, type ReactNode, isValidElement } from "react";
import { PageShell } from "./pageShell";
import { DisplayModeToggle } from "./displayModeToggle";
import type { DataProvenance } from "./dataProvenanceStrip";
import { type ReportSectionLink } from "./reportShellNavigation";
import { AppSidebar } from "./AppSidebar";
import { type ReportStageItem } from "./reportRevampElements";
import { INTERNAL_USE_LABEL } from "../../lib/exportNotices";
import { ReportCta } from "./reportCta";
import type { RegimeIconType } from "./pageShell";
import { RegimeCommandBar, type RegimeCommandBarProps } from "./RegimeCommandBar";
import { resolveTrustReadinessCopy } from "../../lib/report/trustStatus";
import { InternalAwareLink } from "./report-shell/InternalAwareLink";
import { CommandCenterNavBlock } from "./report-shell/CommandCenterNavBlock";
import { SidebarSequenceBlock } from "./report-shell/SidebarSequenceBlock";
import {
  HeroTrustProvenanceBlock,
  InlineTrustBlock,
} from "./report-shell/TrustBlocks";
import type {
  DecisionBanner,
  DecisionDiff,
  ExportCtaProps,
  ReportCtaProps,
  RoleSwitcher,
  SecondaryCtaProps,
} from "./report-shell/types";

type ReportShellInput = {
  statusLabel: string;
  regime?: RegimeIconType;
  recordDateLabel: string;
  fetchedAtLabel: string;
  treasurySource: string;
  pageTitle: string;
  pageSummary: string;
  pageSummaryLink?: { href: string; label: string };
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
  sidebarVariant?: "full" | "hidden";
  hideHeroChrome?: boolean;
  primaryCta?: ReportCtaProps;
  secondaryCta?: SecondaryCtaProps;
  exportCta?: ExportCtaProps | null;
  sharePayload?: React.ComponentProps<typeof ShareMenuDropdown> | null;
  structuredData?: unknown;
  historicalBanner?: ReactNode;
  currentPath: string;
  stageRail?: {
    title?: string;
    items: ReportStageItem[];
  };
  decisionBanner?: DecisionBanner;
  roleSwitcher?: RoleSwitcher;
  decisionDiffs?: DecisionDiff[];
  nextStep?: { description: string; href: string };
  nextRefreshLabel?: string;
  inlineTrustPlacement?: "before-content" | "after-first-section" | "hidden";
  provenance?: DataProvenance;
  commandBar?: RegimeCommandBarProps;
  ambientMode?: "standard" | "tv";
};

type ReportShellModel = {
  status: Pick<ReportShellInput, "statusLabel" | "regime" | "recordDateLabel" | "fetchedAtLabel" | "treasurySource">;
  page: Pick<ReportShellInput, "pageTitle" | "pageSummary" | "pageSummaryLink" | "sectionLinks" | "currentPath">;
  trust: Pick<ReportShellInput, "trustStatusLabel" | "trustStatusDetail" | "trustStatusAction" | "trustStatusTone" | "outageType" | "outageSeverity" | "decisionImpactWindow" | "approvalBuckets" | "recoveryPlan" | "outageExitGate" | "degradedSourceRows" | "showOfflineBadge" | "offlineBadgeLabel" | "inlineTrustPlacement" | "provenance">;
  chrome?: Pick<ReportShellInput, "heroVariant" | "sidebarVariant" | "hideHeroChrome" | "ambientMode">;
  actions?: Pick<ReportShellInput, "primaryCta" | "secondaryCta" | "exportCta" | "sharePayload" | "nextStep" | "nextRefreshLabel">;
  payloads?: Pick<ReportShellInput, "structuredData" | "historicalBanner" | "stageRail" | "decisionBanner" | "roleSwitcher" | "decisionDiffs" | "commandBar">;
};

type ReportShellProps = { children: ReactNode } & (
  | ({ model: ReportShellModel } & { [K in keyof ReportShellInput]?: never })
  | ({ model?: never } & ReportShellInput)
);

export { CommandCenterNavBlock } from "./report-shell/CommandCenterNavBlock";
export {
  HeroTrustProvenanceBlock,
  resolveTrustProvenance,
} from "./report-shell/TrustBlocks";
export { SidebarSequenceBlock } from "./report-shell/SidebarSequenceBlock";

import { ShareMenuDropdown } from "./report-shell/ShareMenuDropdown";

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
    sidebarVariant: resolvedSidebarVariant = "full",
    hideHeroChrome: resolvedHideHeroChrome = false,
    primaryCta: inputPrimaryCta,
    secondaryCta: resolvedSecondaryCta,
    exportCta: inputExportCta,
    sharePayload: resolvedSharePayload,
    structuredData: resolvedStructuredData,
    historicalBanner: resolvedHistoricalBanner,
    stageRail: resolvedStageRail,
    decisionBanner: resolvedDecisionBanner,
    roleSwitcher: resolvedRoleSwitcher,
    decisionDiffs: resolvedDecisionDiffs,
    nextStep: resolvedNextStep,
    nextRefreshLabel,
    inlineTrustPlacement: resolvedInlineTrustPlacement = "before-content",
    provenance: resolvedProvenance,
    commandBar: resolvedCommandBar,
    ambientMode: resolvedAmbientMode = "standard",
  } = input;
  const resolvedPrimaryCta =
    inputPrimaryCta ?? (resolvedCurrentPath === "/" ? undefined : { href: "#weekly-action-summary", label: "This week" });
  const resolvedExportCta = inputExportCta ?? null;
  const resolvedNextRefreshLabel = nextRefreshLabel ?? (resolvedTrustStatusTone === "historical" ? "Fixed historical snapshot" : "15m cadence");
  const contentSections = Children.toArray(children);
  const summaryLink = resolvedPageSummaryLink ? <InternalAwareLink href={resolvedPageSummaryLink.href} className="inline-flex min-h-[44px] items-center text-xs font-semibold text-sky-200 underline decoration-slate-500/80 underline-offset-4">{resolvedPageSummaryLink.label}</InternalAwareLink> : null;
  const hasSidebar = resolvedSidebarVariant === "full";
  const sidebarEnabled = hasSidebar;
  const sourceHref = resolvedTreasurySource.startsWith("http") ? resolvedTreasurySource : undefined;
  const sourceLabel = sourceHref ? (() => { try { const hostname = new URL(sourceHref).hostname.replace(/^www\./, ""); if (hostname.includes("stlouisfed.org")) return "FRED"; if (hostname.includes("fiscaldata.treasury.gov")) return "Treasury Fiscal Data"; return hostname; } catch { return resolvedTreasurySource; } })() : resolvedTreasurySource;
  const isPrimaryActionInSectionLinks = resolvedPrimaryCta ? resolvedSectionLinks.some((section) => section.href === resolvedPrimaryCta.href) : false;
  /*
   * Also requires a decision to state. The card's sentence fell back to
   * `${primaryCta.label}.` when no banner existed, so on a route without one
   * (/history) it rendered "Current posture / This week. / [This week]" — a
   * heading, the button's own label as a sentence, and a duplicate of a control
   * already in the header. A card that restates its own button is chrome.
   */
  const showMobileActionCard =
    Boolean(resolvedPrimaryCta) &&
    Boolean(resolvedDecisionBanner?.decision) &&
    !isPrimaryActionInSectionLinks;
  const showIntroBlock = !resolvedHideHeroChrome;
  const renderTrustBeforeContent =
    !showIntroBlock
    && !hasSidebar
    && resolvedInlineTrustPlacement === "before-content";
  const renderTrustAfterFirstSection =
    !showIntroBlock
    && resolvedInlineTrustPlacement !== "hidden"
    && (hasSidebar || resolvedInlineTrustPlacement === "after-first-section");
  const enableTvAmbientMode = resolvedAmbientMode === "tv";
  const trustReadiness = resolveTrustReadinessCopy({
    trustStatusTone: resolvedTrustStatusTone,
    degradedSourceRows: resolvedDegradedSourceRows,
    trustStatusDetail: resolvedTrustStatusDetail,
  });
  const controlHeadline = trustReadiness.headline;
  const trustStatusDetailForDisplay = resolvedTrustStatusDetail;
  const trustStatusActionForDisplay = resolvedTrustStatusAction;
  const extendedCommandBar =
    showIntroBlock && resolvedCurrentPath === "/" ? resolvedCommandBar : undefined;
  const trustBlockProps = {
    trustStatusTone: trustReadiness.tone,
    trustStatusLabel: controlHeadline,
    trustStatusDetail: trustStatusDetailForDisplay,
    trustStatusAction: trustStatusActionForDisplay,
    outageType: resolvedOutageType,
    outageSeverity: resolvedOutageSeverity,
    decisionImpactWindow: resolvedDecisionImpactWindow,
    approvalBuckets: resolvedApprovalBuckets,
    recoveryPlan: resolvedRecoveryPlan,
    outageExitGate: resolvedOutageExitGate,
    degradedSourceRows: resolvedDegradedSourceRows,
    statusLabel: resolvedStatusLabel,
    fetchedAtLabel: resolvedFetchedAtLabel,
    resolvedNextRefreshLabel,
    sourceLabel,
    sourceHref,
    provenance: resolvedProvenance,
  } as const;

  return (
    <PageShell
      regime={resolvedRegime}
      structuredData={resolvedStructuredData}
      ambientMode={resolvedAmbientMode}
    >
          {resolvedHistoricalBanner}
          {extendedCommandBar ? <div className="mt-2"><RegimeCommandBar {...extendedCommandBar} /></div> : null}

          <div className={`mt-2 ${sidebarEnabled ? "md:grid md:grid-cols-[12rem_minmax(0,1fr)] md:gap-4 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-5" : ""}`}>
            {sidebarEnabled ? (
              <aside className="hidden md:block md:sticky md:top-4 md:self-start md:h-[calc(100vh-2rem)] md:overflow-y-auto">
                <AppSidebar sectionLinks={resolvedSectionLinks} />
              </aside>
            ) : null}

            {/* Between whole report sections. Was space-y-5/6, the same 20-24px
                used between items *inside* a section, so section boundaries
                carried no more weight than item boundaries. */}
            <div className={`order-1 min-w-0 space-y-10 lg:space-y-12 ${sidebarEnabled ? "" : "mx-auto w-full max-w-[72rem]"}`}>
              {showIntroBlock ? <CommandCenterNavBlock heroVariant={resolvedHeroVariant} pageTitle={resolvedPageTitle} pageSummary={resolvedPageSummary} summaryLink={summaryLink} recordDateLabel={resolvedRecordDateLabel} roleSwitcher={resolvedRoleSwitcher} primaryCta={resolvedPrimaryCta} secondaryCta={resolvedSecondaryCta} exportCta={resolvedExportCta} sharePayload={resolvedSharePayload} nextStep={resolvedNextStep} statusLabel={resolvedStatusLabel} trustStatusLabel={controlHeadline} fetchedAtLabel={resolvedFetchedAtLabel} resolvedNextRefreshLabel={resolvedNextRefreshLabel} trustStatusAction={trustStatusActionForDisplay} showOfflineBadge={resolvedShowOfflineBadge} offlineBadgeLabel={resolvedOfflineBadgeLabel} decisionBanner={resolvedDecisionBanner} missionSupportText={trustStatusDetailForDisplay} decisionDiffs={resolvedDecisionDiffs} /> : null}

              <SidebarSequenceBlock stageRail={resolvedStageRail} />

              {renderTrustBeforeContent ? <InlineTrustBlock {...trustBlockProps} /> : null}

              {/* The section rule was white/[0.04] — below the visible threshold
                  by this repo's own measure (see the border-alpha note in
                  tokens.css, which raised the floor to 0.10 for exactly this
                  reason). So report pages had no visible section boundary at
                  all, and the only thing chunking them was 24px of padding that
                  matched the spacing used *inside* sections. A visible rule plus
                  a wider outer gap makes the boundary the strongest horizontal
                  signal on the page. */}
              {/* Token, not divide-white/[0.10]: a hardcoded white rule is
                  invisible on the light theme's near-white ground, and 0.10 is
                  not one of the four alphas the light escape-hatch block
                  remaps. */}
              <div className="divide-y divide-[color:var(--border-default)]">
                {contentSections.map((section, index) => {
                  const sectionKey =
                    isValidElement(section) && section.key != null
                      ? section.key
                      : `section-${index}`;
                  return (
                    // `empty:hidden` because a section can decide at render time not to
                    // render — ReturningVisitorDeltaStrip returns null for anyone without
                    // a stored previous read, which is every first-time visitor.
                    // Children.toArray only drops children that are already null at the
                    // JSX level, so such a section still claimed a padded row and drew its
                    // divider: an empty ~64px band between two rules on a first visit.
                    <div
                      key={sectionKey}
                      className={`empty:hidden ${index === 0 ? "pb-6 lg:pb-8" : "py-6 lg:py-8"}`}
                    >
                      {section}
                      {renderTrustAfterFirstSection && index === 0 ? (
                        <div className="mt-4">
                          <InlineTrustBlock {...trustBlockProps} />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <footer className="mt-8 border-t border-white/[0.04] pt-4 text-fluid-xs font-semibold tracking-[0.18em] text-slate-400">
                {INTERNAL_USE_LABEL && <p>{INTERNAL_USE_LABEL}</p>}
              </footer>
            </div>
          </div>

        {showMobileActionCard && resolvedPrimaryCta ? <div className="sm:hidden mt-6 px-4"><section className="weather-panel border-sky-500/40 bg-slate-950/95 px-3 py-3"><p className="text-fluid-xs font-semibold tracking-[0.14em] text-slate-300">Current posture</p><div className="mt-2 flex items-center justify-between gap-3"><p className="max-w-[16rem] text-xs font-semibold text-slate-100">{resolvedDecisionBanner?.decision}</p><ReportCta href={resolvedPrimaryCta.href} copyText={resolvedPrimaryCta.copyText} copyTarget={resolvedPrimaryCta.copyTarget} label={resolvedPrimaryCta.label} className="weather-button-primary inline-flex min-h-[44px] flex-shrink-0 items-center justify-center rounded-md px-3 py-2 text-xs font-semibold tracking-[0.14em]">{resolvedPrimaryCta.label}</ReportCta></div></section></div> : null}

        {enableTvAmbientMode && resolvedPrimaryCta ? <aside className="tv-action-rail" aria-label="TV quick actions"><p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Quick actions</p><div className="mt-2 grid gap-2"><ReportCta href={resolvedPrimaryCta.href} copyText={resolvedPrimaryCta.copyText} copyTarget={resolvedPrimaryCta.copyTarget} label={resolvedPrimaryCta.label} className="weather-button-primary inline-flex min-h-[56px] items-center justify-center px-4 py-2 text-center text-sm font-semibold tracking-[0.12em] text-slate-100">{resolvedPrimaryCta.label}</ReportCta>{resolvedSecondaryCta ? <InternalAwareLink href={resolvedSecondaryCta.href} className="weather-pill inline-flex min-h-[56px] items-center justify-center px-4 py-2 text-center text-sm font-semibold tracking-[0.12em] text-slate-200">{resolvedSecondaryCta.label}</InternalAwareLink> : null}<DisplayModeToggle /></div></aside> : null}
    </PageShell>
  );
};
