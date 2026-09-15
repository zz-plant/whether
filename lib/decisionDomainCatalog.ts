import {
  failureModes,
  postureKeys,
  rawDecisionDomainCatalog,
  situationUseCaseSlugs,
  startSituations,
  toolkitSlugs,
} from "./decisionDomainCatalogContent";
import { parseDecisionDomainCatalog } from "./decisionDomainCatalogSchema";

type PostureKey = (typeof postureKeys)[number];

type PostureDefinition = {
  slug: PostureKey;
  title: string;
  summary: string;
  trigger: string;
  defaults: string[];
};

export { failureModes, startSituations };

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
  canonLinks: { label: string; href: string }[];
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

export const postureDefinitions: PostureDefinition[] = decisionDomainCatalog.postureDefinitions;
export const useCaseRoles: UseCaseRole[] = decisionDomainCatalog.useCaseRoles;
export const situationUseCaseDefinitions: SituationUseCase[] =
  decisionDomainCatalog.situationUseCaseDefinitions;
const situationUseCases = [...situationUseCaseSlugs] as [
  SituationUseCaseSlug,
  ...SituationUseCaseSlug[],
];
export const situationRouting: Record<(typeof startSituations)[number], SituationUseCaseSlug> =
  decisionDomainCatalog.situationRouting;
export const toolkitDefinitions: ToolkitDefinition[] = decisionDomainCatalog.toolkitDefinitions;
export const failureModeDefinitions: FailureModeDefinition[] =
  decisionDomainCatalog.failureModeDefinitions;

const useCaseRoleStaticParams = useCaseRoles.map((entry) => ({ slug: entry.slug }));
const situationUseCaseStaticParams = situationUseCases.map((slug) => ({ slug }));
export const decideStaticParams = [...useCaseRoleStaticParams, ...situationUseCaseStaticParams];

const useCaseRoleBySlug = new Map<string, UseCaseRole>(useCaseRoles.map((entry) => [entry.slug, entry]));
const situationUseCaseBySlug = new Map<SituationUseCaseSlug, SituationUseCase>(
  situationUseCaseDefinitions.map((entry) => [entry.slug, entry]),
);
const toolkitDefinitionBySlug = new Map<ToolkitSlug, ToolkitDefinition>(
  toolkitDefinitions.map((entry) => [entry.slug, entry]),
);

const isToolkitSlug = (slug: string): slug is ToolkitSlug => toolkitDefinitionBySlug.has(slug as ToolkitSlug);

export const findUseCaseRole = (slug: string) => useCaseRoleBySlug.get(slug);
export const findSituationUseCase = (slug: string) =>
  isSituationUseCaseSlug(slug) ? situationUseCaseBySlug.get(slug) : undefined;
export const isSituationUseCaseSlug = (slug: string): slug is SituationUseCaseSlug =>
  situationUseCases.includes(slug as SituationUseCaseSlug);
export const findToolkitDefinition = (slug: string) =>
  isToolkitSlug(slug) ? toolkitDefinitionBySlug.get(slug) : undefined;
export const toolkitStaticParams = toolkitDefinitions.map((entry) => ({ slug: entry.slug }));

export const decideHomeRecommendedToolkitSlugs: ToolkitSlug[] = Array.from(
  new Set([
    ...useCaseRoles.flatMap((role) => role.recommendedToolkitSlugs),
    ...situationUseCaseDefinitions.flatMap((entry) => entry.recommendedToolkitSlugs),
  ]),
) as ToolkitSlug[];

export const findDecisionPathsForToolkit = (toolkitSlug: ToolkitDefinition["slug"]) => ({
  roles: useCaseRoles
    .filter((role) => role.recommendedToolkitSlugs.includes(toolkitSlug))
    .map((role) => ({ slug: role.slug, title: role.title, href: `/resolve/${role.slug}` })),
  situations: situationUseCaseDefinitions
    .filter((situation) =>
      situation.recommendedToolkitSlugs.some((recommendedSlug) => recommendedSlug === toolkitSlug),
    )
    .map((situation) => ({ slug: situation.slug, title: situation.title, href: `/resolve/${situation.slug}` })),
});
