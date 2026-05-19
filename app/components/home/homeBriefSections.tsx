import { Suspense } from "react";
import Link from "next/link";
import { WeeklyDecisionCard } from "../weeklyDecisionCard";
import { ArtifactActionsFallback } from "./artifactActionsFallback";
import { WeeklyDiagnosticsFallback } from "./weeklyDiagnosticsFallback";
import { StreamedSectionReveal } from "../streamedSectionReveal";
import { HomeWorkspaceBands } from "./homeWorkspaceBands";
import { HomeInterpretationPanel } from "../homeInterpretationPanel";
import { LiveDataFallbackAlert } from "../liveDataFallbackAlert";
import { OperatorWorkflowRouteTracker } from "../operatorWorkflowRouteTracker";
import type { ArtifactPayload, HomePageAssembly, HomePageWorkspaceModel } from "../../../lib/report/homePageAssembler";
import type { ArtifactMode } from "../../../lib/literacyAssist";
import { CopyLeadershipArtifactsButtons } from "../copyLeadershipArtifactsButtons";
import { DownloadBriefingPackButton } from "../downloadBriefingPackButton";
import { interpretationViews } from "../../../lib/report/interpretationLayer";
import type { InterpretationView } from "../../../lib/report/interpretationLayer";
import type { Route } from "../../../lib/navigation/routeType";
import { BEGINNER_GLOSSARY_ENTRIES } from "../../../lib/report/reportCopy";
import { StartupModeSection } from "./startupModeSection";

type ArtifactActionsProps = {
  leadershipArtifactPayloadPromise: Promise<ArtifactPayload | null>;
  fallbackActive: boolean;
  initialArtifactMode?: ArtifactMode;
  recordDateLabel?: string;
};

const LeadershipArtifactActions = async ({
  leadershipArtifactPayloadPromise,
  fallbackActive,
  initialArtifactMode,
  recordDateLabel,
}: ArtifactActionsProps) => {
  const artifactPayload = await leadershipArtifactPayloadPromise;

  if (!artifactPayload) {
    return (
      <p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
        Can&apos;t share right now. Use the card above.
      </p>
    );
  }

  return (
    <StreamedSectionReveal delay="medium">
      <details className="weather-auto-chevron weather-transmission-segment mt-3 px-3 py-3">
        <summary className="cursor-pointer list-none text-fluid-micro font-semibold uppercase tracking-[0.1em] text-slate-400">
          Share &amp; export
        </summary>
        <div className="mt-3 space-y-4">
        <DownloadBriefingPackButton
          meetingPackText={artifactPayload.meetingPackText}
          recordDate={recordDateLabel ?? "weekly"}
        />
        <CopyLeadershipArtifactsButtons
          weeklyCallSnapshot={artifactPayload.weeklyCallSnapshotText}
          weeklyOperatorBrief={artifactPayload.weeklyOperatorBriefText}
          deltaOnlyBrief={artifactPayload.deltaOnlyBriefText}
          boardSummary={artifactPayload.boardSummary}
          citation={artifactPayload.callCitation}
          fallbackActive={fallbackActive}
          initialArtifactMode={initialArtifactMode}
          moreFormatsHref="/planning#ops-export-briefs"
        />
        </div>
      </details>
    </StreamedSectionReveal>
  );
};

const HOMEPAGE_GLOSSARY_VALUES = ["regime", "posture", "confidence", "tightness", "risk-appetite", "flip-condition", "guardrail"];

export const HomeKeyTermsDisclosure = () => {
  const entries = BEGINNER_GLOSSARY_ENTRIES.filter((entry) => HOMEPAGE_GLOSSARY_VALUES.includes(entry.value));

  return (
    <details className="weather-surface-secondary group mx-0 mb-4 px-4 py-3">
      <summary className="cursor-pointer list-none text-fluid-xs font-semibold uppercase tracking-[0.1em] text-slate-400 hover:text-slate-200">
        Key terms
      </summary>
      <div className="mt-3 grid gap-2 pt-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.value} className="rounded-md border border-white/[0.06] bg-white/[0.03] px-3 py-2">
            <p className="text-xs font-semibold text-slate-100">{entry.term}</p>
            <p className="mt-1 text-fluid-xs leading-relaxed text-slate-400">{entry.summary}</p>
          </div>
        ))}
      </div>
    </details>
  );
};

export const HomeWhatChangedSection = ({
  weeklyDecisionCardModel,
  leadershipArtifactPayloadPromise,
  fallbackActive,
  searchParams,
  initialArtifactMode,
}: {
  weeklyDecisionCardModel: HomePageAssembly["weeklyDecisionCardModel"];
  leadershipArtifactPayloadPromise: Promise<ArtifactPayload | null>;
  fallbackActive: boolean;
  searchParams?: Record<string, string | undefined>;
  initialArtifactMode?: ArtifactMode;
}) => (
  <>
    <OperatorWorkflowRouteTracker />
    <WeeklyDecisionCard
      model={weeklyDecisionCardModel}
      searchParams={searchParams}
      actions={(
        <Suspense fallback={<ArtifactActionsFallback />}>
          <LeadershipArtifactActions
            leadershipArtifactPayloadPromise={leadershipArtifactPayloadPromise}
            fallbackActive={fallbackActive}
            initialArtifactMode={initialArtifactMode}
            recordDateLabel={weeklyDecisionCardModel.artifact.recordDateLabel}
          />
        </Suspense>
      )}
    />
    <StartupModeSection startupVariantPolicy={weeklyDecisionCardModel.decision.startupVariantPolicy} />
  </>
);

export const HomeDecisionSection = ({
  workspaceModelPromise,
}: {
  workspaceModelPromise: Promise<HomePageWorkspaceModel>;
}) => (
  <Suspense fallback={<WeeklyDiagnosticsFallback />}>
    <StreamedSectionReveal delay="short">
      <HomeWorkspaceBands workspaceModelPromise={workspaceModelPromise} />
    </StreamedSectionReveal>
  </Suspense>
);

const interpretationLabels: Record<InterpretationView, string> = {
  default: "Default",
  sector: "Sector",
  company: "Company",
  financial: "Financial",
  forecast: "Posture",
};

const buildViewHref = (
  view: InterpretationView,
  searchParams: Record<string, string | undefined> | undefined,
) => {
  const params = new URLSearchParams();
  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (typeof value === "string" && value.length > 0 && key !== "view") {
      params.set(key, value);
    }
  });
  if (view !== "default") {
    params.set("view", view);
  }
  const query = params.toString();
  return query.length > 0 ? `/?${query}` : "/";
};

const InterpretationViewPills = ({
  activeView,
  searchParams,
}: {
  activeView: InterpretationView;
  searchParams?: Record<string, string | undefined>;
}) => (
  <div className="weather-surface-secondary px-4 py-3">
    <p className="mb-2 text-fluid-micro font-semibold uppercase tracking-[0.12em] text-slate-400">View as</p>
    <nav className="flex flex-wrap gap-1.5" aria-label="Interpretation view">
      {interpretationViews.map((view) => (
        <Link
          key={view}
          href={buildViewHref(view, searchParams) as Route}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-fluid-micro font-semibold uppercase tracking-[0.08em] transition-colors ${
            activeView === view
              ? "border border-sky-300/60 bg-sky-400/10 text-sky-100"
              : "border border-white/[0.08] text-slate-400 hover:border-white/[0.14] hover:text-slate-200"
          }`}
          aria-current={activeView === view ? "page" : undefined}
        >
          {interpretationLabels[view]}
        </Link>
      ))}
    </nav>
  </div>
);

export const HomeRevisitFlipSection = ({
  interpretationLayer,
  interpretationSearchParams,
  fallbackAlert,
}: {
  interpretationLayer: HomePageAssembly["interpretationLayer"];
  interpretationSearchParams?: Record<string, string | undefined>;
  fallbackAlert: HomePageAssembly["fallbackAlert"];
}) => (
  <>
    <InterpretationViewPills
      activeView={interpretationLayer.view}
      searchParams={interpretationSearchParams}
    />

    {interpretationLayer.view !== "default" ? (
      <StreamedSectionReveal delay="medium">
        <HomeInterpretationPanel
          layer={interpretationLayer}
          searchParams={interpretationSearchParams}
        />
      </StreamedSectionReveal>
    ) : null}

    {fallbackAlert ? (
      <StreamedSectionReveal delay="medium">
        <LiveDataFallbackAlert
          lastCachedTimestamp={fallbackAlert.lastCachedTimestamp}
          sourceLabel={fallbackAlert.sourceLabel}
          effectiveRecordDate={fallbackAlert.effectiveRecordDate}
          fallbackReason={fallbackAlert.fallbackReason}
        />
      </StreamedSectionReveal>
    ) : null}
  </>
);
