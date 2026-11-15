import {
  failureModes,
  rawDecisionDomainCatalog,
  situationUseCaseSlugs,
  toolkitSlugs,
} from "./decisionDomainCatalogContent";
import { parseDecisionDomainCatalog } from "./decisionDomainCatalogSchema";


type ToolkitSlug = (typeof toolkitSlugs)[number];

type UseCaseRole = {
  slug: string;
  title: string;
  decisions: string[];
  failureModes: string[];
  postureShifts: string[];
  recommendedToolkitSlugs: ToolkitSlug[];
};

type SituationUseCaseSlug = (typeof situationUseCaseSlugs)[number];

type SituationUseCase = {
  slug: SituationUseCaseSlug;
  title: string;
  recommendedToolkitSlugs: ToolkitSlug[];
};

type ToolkitDefinition = {
  slug: ToolkitSlug;
  title: string;
  whenToUse: string;
  byPosture: string;
  operatingOutcome: string;
  decisionThisSession: string;
  tightenNow: string;
  loosenNow: string;
  proceedThreshold: string;
  stopTrigger: string;
  reversalTrigger: string;
  decisionArtifact: string;
  timeToRun: string;
  recommendedParticipants: string;
  prepChecklist: string[];
  successSignals: string[];
  instruments: string[];
  runSequence: {
    phase: string;
    objective: string;
    prompts: string[];
    deliverable: string;
  }[];
  misuseCases: string[];
};

type FailureModeDefinition = {
  slug: (typeof failureModes)[number];
  title: string;
  summary: string;
  trigger: string;
  symptoms: string[];
  firstMoves: string[];
  linkedToolkits: { label: string; href: string }[];
  linkedConcepts: { label: string; href: string }[];
};

const decisionDomainCatalog = parseDecisionDomainCatalog(rawDecisionDomainCatalog);

export const useCaseRoles: UseCaseRole[] = decisionDomainCatalog.useCaseRoles;
export const situationUseCaseDefinitions: SituationUseCase[] =
  decisionDomainCatalog.situationUseCaseDefinitions;
export const toolkitDefinitions: ToolkitDefinition[] = decisionDomainCatalog.toolkitDefinitions;
export const failureModeDefinitions: FailureModeDefinition[] =
  decisionDomainCatalog.failureModeDefinitions;

const toolkitDefinitionBySlug = new Map<ToolkitSlug, ToolkitDefinition>(
  toolkitDefinitions.map((entry) => [entry.slug, entry]),
);

const isToolkitSlug = (slug: string): slug is ToolkitSlug => toolkitDefinitionBySlug.has(slug as ToolkitSlug);

export const findToolkitDefinition = (slug: string) =>
  isToolkitSlug(slug) ? toolkitDefinitionBySlug.get(slug) : undefined;

export const decideHomeRecommendedToolkitSlugs: ToolkitSlug[] = Array.from(
  new Set([
    ...useCaseRoles.flatMap((role) => role.recommendedToolkitSlugs),
    ...situationUseCaseDefinitions.flatMap((entry) => entry.recommendedToolkitSlugs),
  ]),
) as ToolkitSlug[];
