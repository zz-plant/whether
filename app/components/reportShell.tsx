/**
 * Shared report shell layout for Whether Report pages.
 * Keeps header, navigation, and layout consistent across multi-page views.
 */
import Image from "next/image";
import Link from "next/link";
import { Children, type ReactNode, isValidElement } from "react";
import { DisplayGuardian } from "./displayGuardian";
import { DisplayModeManager } from "./displayModeManager";
import { DisplayModeToggle } from "./displayModeToggle";
import { CanonicalTrustModule } from "./canonicalTrustModule";
import { DataProvenanceStrip, type DataProvenance } from "./dataProvenanceStrip";
import {
  ReportMobileNavigation,
  ReportPageNavigation,
  type ReportPageLink,
  type ReportSectionLink,
} from "./reportShellNavigation";
import { type ReportStageItem } from "./reportRevampElements";
import { INFORMATIONAL_NOTICE } from "../../lib/exportNotices";
import { serializeJsonLd } from "../../lib/seo";
import { AnchorFeedback } from "./anchorFeedback";
import { ReportCta } from "./reportCta";
import { NavigationOrientationBadge } from "./navigationOrientationBadge";

import { ClimateBackdrop } from "./climateBackdrop";
import { RegimeIconType } from "./regimeIcons";
import { ArrowRightIcon } from "./uiIcons";

type ReportCtaProps = { href: string; label: string; copyText?: string; copyTarget?: string };
type SecondaryCtaProps = { href: string; label: string };
type ExportCtaProps = { href: string; label: string };

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
  statusLabel: string;
  regime?: RegimeIconType;
  recordDateLabel: string;
  fetchedAtLabel: string;
  dataProvenance: DataProvenance;
  pageTitle: string;
  pageSummary: string;
  pageSummaryLink?: { href: string; label: string };
  pageLinks: ReportPageLink[];
  sectionLinks: ReportSectionLink[];
  trustStatusLabel: string;
  trustStatusDetail: string;
  trustStatusAction: string;
  trustStatusTone: "stable" | "warning" | "historical";
  showOfflineBadge?: boolean;
  offlineBadgeLabel?: string;
  heroVariant?: "full" | "compact";
  pageNavVariant?: "full" | "compact";
  showPageNavigation?: boolean;
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
};

export function HeroTrustProvenanceBlock({
  trustStatusTone,
  trustStatusLabel,
  trustStatusDetail,
  trustStatusAction,
  dataProvenance,
}: {
  trustStatusTone: "stable" | "warning" | "historical";
  trustStatusLabel: string;
  trustStatusDetail: string;
  trustStatusAction: string;
  dataProvenance: DataProvenance;
}) {
  return (
    <>
      <CanonicalTrustModule
        tone={trustStatusTone}
        label={trustStatusLabel}
        detail={trustStatusDetail}
        action={trustStatusAction}
        provenanceContent={<DataProvenanceStrip provenance={dataProvenance} variant="compact" />}
      />
      <p className="mt-3 text-xs text-slate-300">Use this for near-term planning decisions, not long-range forecasting.</p>
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
  primaryCta: ReportCtaProps;
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
  const primaryDecisionText = decisionBanner?.decision ?? `${primaryCta.label}.`;
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
                  return <a key={option.key} href={option.href} aria-current={isActive ? "page" : undefined} className={`weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-sm font-semibold tracking-[0.08em] ${isActive ? "border-sky-300/80 text-slate-100" : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"}`}>{option.label}</a>;
                })}
              </div>
            </div>
          ) : null}
          <p className="text-xs font-semibold tracking-[0.14em] text-slate-400 sm:tracking-[0.18em]">Whether report</p>
          <h1 className={heroVariant === "compact" ? "text-2xl font-semibold text-slate-100 sm:text-3xl" : "type-headline text-slate-100"}>{pageTitle}</h1>
          <p className="flex max-w-2xl flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-relaxed text-slate-200 sm:text-base"><span>{pageSummary}</span>{summaryLink}</p>
          {heroVariant === "full" ? <span className="sr-only">Signals stamped {recordDateLabel}</span> : null}
        </div>

        <div id="report-primary-actions" className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <ReportCta href={primaryCta.href} copyText={primaryCta.copyText} copyTarget={primaryCta.copyTarget} label={primaryCta.label} className="weather-button-primary inline-flex min-h-[44px] w-full max-w-full items-center justify-center px-4 py-2 text-center text-xs font-semibold leading-tight tracking-[0.12em] sm:w-auto"><span className="max-w-full break-words text-center">{primaryCta.label}</span></ReportCta>
          {secondaryCta ? <a href={secondaryCta.href} className="weather-pill inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-slate-700/80 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100 sm:w-auto">{secondaryCta.label}</a> : null}
          {exportCta ? <a href={exportCta.href} className="weather-pill inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-sky-400/70 bg-sky-500/10 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-sky-100 sm:w-auto">{exportCta.label}</a> : null}
        </div>
        {nextStep ? <p className="text-xs font-semibold tracking-[0.1em] text-slate-300">Next step: <a href={nextStep.href} className="text-sky-200 underline decoration-slate-500/80 underline-offset-4">{nextStep.description}</a></p> : null}
        <p className="weather-surface inline-flex min-h-[44px] flex-wrap items-center gap-x-2 px-3 py-2 text-xs font-semibold tracking-[0.08em] text-slate-100"><span>Posture {statusLabel}</span><span className="text-slate-400">·</span><span>Confidence {trustStatusLabel}</span><span className="text-slate-400">·</span><span>Updated {fetchedAtLabel}</span><span className="text-slate-400">·</span><span>Next refresh {resolvedNextRefreshLabel}</span></p>
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
            {decisionBanner?.evidenceHref ? <a href={decisionBanner.evidenceHref} className="inline-flex min-h-[44px] items-center text-xs font-semibold tracking-[0.14em] text-sky-200 underline">Review evidence trail<ArrowRightIcon className="ml-1 h-3.5 w-3.5" /></a> : null}
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
            <a href={item.href} className="weather-pill inline-flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200" aria-current={item.status === "current" ? "step" : undefined}>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">{index + 1}</span>
              <span>{item.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

export const ReportShell = ({
  children,
  statusLabel,
  regime,
  recordDateLabel,
  fetchedAtLabel,
  dataProvenance,
  pageTitle,
  pageSummary,
  pageSummaryLink,
  pageLinks,
  sectionLinks,
  trustStatusLabel,
  trustStatusDetail,
  trustStatusAction,
  trustStatusTone,
  showOfflineBadge = false,
  offlineBadgeLabel = "Cached snapshot",
  heroVariant = "full",
  pageNavVariant = "full",
  showPageNavigation = false,
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
}: ReportShellProps) => {
  const resolvedNextRefreshLabel = nextRefreshLabel ?? (trustStatusTone === "historical" ? "Fixed historical snapshot" : "15m cadence");
  const contentSections = Children.toArray(children);
  const summaryLink = pageSummaryLink ? <a href={pageSummaryLink.href} className="inline-flex min-h-[44px] items-center text-xs font-semibold text-sky-200 underline decoration-slate-500/80 underline-offset-4">{pageSummaryLink.label}</a> : null;
  const hasSidebar = sidebarVariant === "full";
  const missionSequenceLabels = ["Now", "Next", "Later"];
  const missionSequenceTitle = actionSequence?.title ?? "Plan";
  const missionSequenceItems = (actionSequence?.items ?? []).slice(0, 3).map((item, index) => ({ ...item, phase: missionSequenceLabels[index] ?? `Step ${index + 1}` }));
  const showPostureRibbon = currentPath !== "/";
  const isPrimaryActionInSectionLinks = sectionLinks.some((section) => section.href === primaryCta.href);
  const showMobileActionCard = !isPrimaryActionInSectionLinks;
  const showInlineTrustBlock = !hasSidebar;
  const renderTrustBeforeContent = showInlineTrustBlock && inlineTrustPlacement === "before-content";
  const renderTrustAfterFirstSection = showInlineTrustBlock && inlineTrustPlacement === "after-first-section";

  return (
    <>
      <main id="main-content" tabIndex={-1} className="weather-shell relative min-h-screen overflow-x-clip text-slate-100">
        <ClimateBackdrop regime={regime || "NEUTRAL"} />
        {structuredData ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} /> : null}
        <DisplayModeManager />
        <AnchorFeedback />
        <DisplayGuardian />
        <div className="tv-rail-safe mx-auto max-w-[82rem] pb-[calc(env(safe-area-inset-bottom)+10rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] pl-[calc(env(safe-area-inset-left)+1rem)] pr-[calc(env(safe-area-inset-right)+1rem)] sm:pb-10 sm:pt-5 sm:pl-[calc(env(safe-area-inset-left)+1.25rem)] sm:pr-[calc(env(safe-area-inset-right)+1.25rem)]">
          <header className="weather-appbar sticky top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 px-4 py-4 sm:top-4 sm:px-6 sm:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3"><Image src="/whether-logo.svg" alt="Whether — Weekly Operating Posture (Hiring, Spend, Roadmap)" width={156} height={36} className="h-9 w-auto" priority /><p className="text-xs text-slate-300 sm:hidden">Signals updated {fetchedAtLabel}</p></div>
              <div className="hidden items-center sm:flex"><p className="text-xs text-slate-300">Signals updated {fetchedAtLabel}</p></div>
            </div>
            <NavigationOrientationBadge currentPath={currentPath} className="mt-4" />
            <p className="mt-2 text-[11px] text-slate-400">Navigation zones only — posture call is shown below.</p>
            {showPageNavigation ? (
              <ReportPageNavigation
                pageLinks={pageLinks}
                pageTitle={pageTitle}
                currentPath={currentPath}
                variant={pageNavVariant}
                className="mt-4 -mx-4 hidden px-4 sm:mx-0 sm:block sm:px-0"
              />
            ) : null}
          </header>

          {showPostureRibbon ? <div className="weather-panel-static mb-4 hidden flex-wrap items-center justify-between gap-2 border border-slate-700/70 px-4 py-2 text-xs sm:flex"><p className="text-slate-300">Current Posture: <span className="font-semibold text-slate-100">{statusLabel}</span><span className="ml-2 text-slate-400">Updated {recordDateLabel}</span></p><Link href="/" className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-[11px] font-semibold tracking-[0.14em]">Open weekly brief</Link></div> : null}
          {historicalBanner}

          <div className={`mt-5 grid min-w-0 gap-5 ${hasSidebar ? "lg:grid-cols-[minmax(0,1fr),260px] lg:items-start" : ""}`}>
            {hasSidebar ? <aside className="order-2 space-y-4 lg:order-none lg:col-start-2 lg:row-start-1 lg:sticky lg:top-28 lg:self-start"><HeroTrustProvenanceBlock trustStatusTone={trustStatusTone} trustStatusLabel={trustStatusLabel} trustStatusDetail={trustStatusDetail} trustStatusAction={trustStatusAction} dataProvenance={dataProvenance} /></aside> : null}

            <div className="order-1 min-w-0 space-y-8 lg:order-none lg:col-start-1 lg:row-start-1 lg:space-y-10">
              {!hideHeroChrome ? <CommandCenterNavBlock heroVariant={heroVariant} pageTitle={pageTitle} pageSummary={pageSummary} summaryLink={summaryLink} recordDateLabel={recordDateLabel} roleSwitcher={roleSwitcher} primaryCta={primaryCta} secondaryCta={secondaryCta} exportCta={exportCta} nextStep={nextStep} statusLabel={statusLabel} trustStatusLabel={trustStatusLabel} fetchedAtLabel={fetchedAtLabel} resolvedNextRefreshLabel={resolvedNextRefreshLabel} trustStatusAction={trustStatusAction} showOfflineBadge={showOfflineBadge} offlineBadgeLabel={offlineBadgeLabel} decisionBanner={decisionBanner} missionSupportText={trustStatusDetail} decisionDiffs={decisionDiffs} missionSequenceTitle={missionSequenceTitle} missionSequenceItems={missionSequenceItems} /> : null}

              <SidebarSequenceBlock stageRail={stageRail} />

              {renderTrustBeforeContent ? <section className="space-y-4"><div className="grid gap-4 lg:grid-cols-2"><HeroTrustProvenanceBlock trustStatusTone={trustStatusTone} trustStatusLabel={trustStatusLabel} trustStatusDetail={trustStatusDetail} trustStatusAction={trustStatusAction} dataProvenance={dataProvenance} /></div></section> : null}

              <div className="space-y-10">{contentSections.map((section, index) => { const sectionKey = isValidElement(section) && section.key != null ? section.key : `section-${index}`; return <div key={sectionKey} className={index === 0 ? "" : "border-t border-slate-800/70 pt-10"}>{section}{renderTrustAfterFirstSection && index === 0 ? <section className="mt-4 space-y-4"><div className="grid gap-4 lg:grid-cols-2"><HeroTrustProvenanceBlock trustStatusTone={trustStatusTone} trustStatusLabel={trustStatusLabel} trustStatusDetail={trustStatusDetail} trustStatusAction={trustStatusAction} dataProvenance={dataProvenance} /></div></section> : null}</div>; })}</div>

              <footer className="mt-12 border-t border-slate-800/70 pt-6 text-xs font-semibold tracking-[0.18em] text-slate-300">
                <p>{INFORMATIONAL_NOTICE}</p>
              </footer>
            </div>
          </div>
        </div>

        {showMobileActionCard ? <div className="sm:hidden mt-6 px-4"><section className="weather-panel border-sky-500/40 bg-slate-950/95 px-3 py-3"><p className="text-[11px] font-semibold tracking-[0.14em] text-slate-300">Current posture</p><div className="mt-2 flex items-center justify-between gap-3"><p className="max-w-[16rem] text-xs font-semibold text-slate-100">{decisionBanner?.decision ?? `${primaryCta.label}.`}</p><ReportCta href={primaryCta.href} copyText={primaryCta.copyText} copyTarget={primaryCta.copyTarget} label={primaryCta.label} className="weather-button-primary inline-flex min-h-[44px] flex-shrink-0 items-center justify-center rounded-full px-3 py-2 text-xs font-semibold tracking-[0.14em]">{primaryCta.label}</ReportCta></div></section></div> : null}

        {showPageNavigation ? <div className="sm:hidden"><ReportMobileNavigation pageLinks={pageLinks} pageTitle={pageTitle} currentPath={currentPath} className="mt-3 px-4 pb-6" sectionLinks={sectionLinks} /></div> : null}

        <aside className="tv-action-rail" aria-label="TV quick actions"><p className="text-xs font-semibold tracking-[0.18em] text-slate-400">Quick actions</p><div className="mt-2 grid gap-2"><ReportCta href={primaryCta.href} copyText={primaryCta.copyText} copyTarget={primaryCta.copyTarget} label={primaryCta.label} className="weather-button-primary inline-flex min-h-[56px] items-center justify-center px-4 py-2 text-center text-sm font-semibold tracking-[0.12em] text-slate-100">{primaryCta.label}</ReportCta>{secondaryCta ? <a href={secondaryCta.href} className="weather-pill inline-flex min-h-[56px] items-center justify-center px-4 py-2 text-center text-sm font-semibold tracking-[0.12em] text-slate-200">{secondaryCta.label}</a> : null}<DisplayModeToggle /></div></aside>
      </main>
    </>
  );
};
