import { Suspense } from "react";
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

type ArtifactActionsProps = {
  leadershipArtifactPayloadPromise: Promise<ArtifactPayload | null>;
  fallbackActive: boolean;
  initialArtifactMode?: ArtifactMode;
};

const LeadershipArtifactActions = async ({
  leadershipArtifactPayloadPromise,
  fallbackActive,
  initialArtifactMode,
}: ArtifactActionsProps) => {
  const artifactPayload = await leadershipArtifactPayloadPromise;

  if (!artifactPayload) {
    return (
      <p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
        Sharing tools are temporarily unavailable. Use the weekly call card as your decision reference while we restore exports.
      </p>
    );
  }

  return (
    <StreamedSectionReveal delay="medium">
      <CopyLeadershipArtifactsButtons
        boardSnippet={artifactPayload.boardSnippetText}
        weeklyCallSnapshot={artifactPayload.weeklyCallSnapshotText}
        weeklyOperatorBrief={artifactPayload.weeklyOperatorBriefText}
        deltaOnlyBrief={artifactPayload.deltaOnlyBriefText}
        boardSummary={artifactPayload.boardSummary}
        citation={artifactPayload.callCitation}
        fallbackActive={fallbackActive}
        initialArtifactMode={initialArtifactMode}
      />
    </StreamedSectionReveal>
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
          />
        </Suspense>
      )}
    />
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
          followUpLabel="Review live evidence"
        />
      </StreamedSectionReveal>
    ) : null}
  </>
);
