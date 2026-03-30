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
import { CopyLeadershipArtifactsButtons } from "../copyLeadershipArtifactsButtons";

type ArtifactActionsProps = {
  artifactPayloadPromise: Promise<ArtifactPayload | null>;
  fallbackActive: boolean;
};

const LeadershipArtifactActions = async ({ artifactPayloadPromise, fallbackActive }: ArtifactActionsProps) => {
  const artifactPayload = await artifactPayloadPromise;

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
        boardSummary={artifactPayload.boardSummary}
        citation={artifactPayload.callCitation}
        fallbackActive={fallbackActive}
      />
    </StreamedSectionReveal>
  );
};

export const HomeWhatChangedSection = ({
  weeklyDecisionCardModel,
  leadershipArtifactPayloadPromise,
  fallbackActive,
  searchParams,
}: {
  weeklyDecisionCardModel: HomePageAssembly["weeklyDecisionCardModel"];
  leadershipArtifactPayloadPromise: Promise<ArtifactPayload | null>;
  fallbackActive: boolean;
  searchParams?: Record<string, string | undefined>;
}) => (
  <>
    <OperatorWorkflowRouteTracker />
    <WeeklyDecisionCard
      model={weeklyDecisionCardModel}
      searchParams={searchParams}
      actions={(
        <Suspense fallback={<ArtifactActionsFallback />}>
          <LeadershipArtifactActions
            artifactPayloadPromise={leadershipArtifactPayloadPromise}
            fallbackActive={fallbackActive}
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
