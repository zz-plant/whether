import { Suspense } from "react";
import { WeeklyDecisionCard } from "../weeklyDecisionCard";
import { ArtifactActionsFallback } from "./artifactActionsFallback";
import { WeeklyDiagnosticsFallback } from "./weeklyDiagnosticsFallback";
import { StreamedSectionReveal } from "../streamedSectionReveal";
import { HomeWorkspaceBands } from "./homeWorkspaceBands";
import { HomeInterpretationPanel } from "../homeInterpretationPanel";
import { LiveDataFallbackAlert } from "../liveDataFallbackAlert";
import { ReturningVisitorDeltaStrip } from "../changeSinceLastReadPanel";
import type { ArtifactPayload, HomePageAssembly, HomePageWorkspaceModel } from "../../../lib/report/homePageAssembler";
import { CopyLeadershipArtifactsButtons } from "../copyLeadershipArtifactsButtons";
import type { RegimeAssessment } from "../../../lib/regimeEngine";

type ArtifactActionsProps = {
  artifactPayloadPromise: Promise<ArtifactPayload | null>;
  fallbackActive: boolean;
};

const LeadershipArtifactActions = async ({ artifactPayloadPromise, fallbackActive }: ArtifactActionsProps) => {
  const artifactPayload = await artifactPayloadPromise;

  if (!artifactPayload) {
    return (
      <p className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
        Artifact export is temporarily unavailable. Use the weekly call card for source-of-truth guidance while we recover.
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
  interpretationSearchParams,
  leadershipArtifactPayloadPromise,
  fallbackActive,
  assessment,
  recordDate,
}: {
  weeklyDecisionCardModel: HomePageAssembly["weeklyDecisionCardModel"];
  interpretationSearchParams?: Record<string, string | undefined>;
  leadershipArtifactPayloadPromise: Promise<ArtifactPayload | null>;
  fallbackActive: boolean;
  assessment: RegimeAssessment;
  recordDate: string;
}) => (
  <>
    <ReturningVisitorDeltaStrip
      assessment={assessment}
      recordDate={recordDate}
      impactLinks={[
        { label: "Current call", href: "#weekly-call-core", metric: "tightness" },
        { label: "Planning", href: "#approve-this-weeks-plan", metric: "riskAppetite" },
        { label: "Evidence", href: "#deep-evidence", metric: "baseRate" },
      ]}
      openPanelHref="#weekly-call-core"
      openPanelLabel="Open current call"
    />
    <WeeklyDecisionCard
      model={weeklyDecisionCardModel}
      searchParams={interpretationSearchParams}
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
