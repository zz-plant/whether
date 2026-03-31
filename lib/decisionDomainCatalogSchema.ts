import { z } from "zod";

import {
  failureModes,
  postureKeys,
  situationUseCaseSlugs,
  startSituations,
  toolkitSlugs,
} from "./decisionDomainCatalogContent";

const linkSchema = z.object({
  label: z.string(),
  href: z.string(),
});

const runSequenceStepSchema = z.object({
  phase: z.string(),
  objective: z.string(),
  prompts: z.array(z.string()),
  deliverable: z.string(),
});

const postureDefinitionSchema = z.object({
  slug: z.enum(postureKeys),
  title: z.string(),
  summary: z.string(),
  trigger: z.string(),
  defaults: z.array(z.string()),
});

const useCaseRoleSchema = z.object({
  slug: z.string(),
  title: z.string(),
  decisions: z.array(z.string()),
  failureModes: z.array(z.string()),
  postureShifts: z.array(z.string()),
  recommendedToolkitSlugs: z.array(z.enum(toolkitSlugs)),
});

const situationUseCaseSchema = z.object({
  slug: z.enum(situationUseCaseSlugs),
  title: z.string(),
  recommendedToolkitSlugs: z.array(z.enum(toolkitSlugs)),
});

const toolkitDefinitionSchema = z.object({
  slug: z.enum(toolkitSlugs),
  title: z.string(),
  whenToUse: z.string(),
  byPosture: z.string(),
  operatingOutcome: z.string(),
  decisionThisSession: z.string(),
  tightenNow: z.string(),
  loosenNow: z.string(),
  proceedThreshold: z.string(),
  stopTrigger: z.string(),
  reversalTrigger: z.string(),
  decisionArtifact: z.string(),
  timeToRun: z.string(),
  recommendedParticipants: z.string(),
  prepChecklist: z.array(z.string()),
  successSignals: z.array(z.string()),
  instruments: z.array(z.string()),
  runSequence: z.array(runSequenceStepSchema),
  misuseCases: z.array(z.string()),
  canonLinks: z.array(linkSchema),
});

const failureModeDefinitionSchema = z.object({
  slug: z.enum(failureModes),
  title: z.string(),
  summary: z.string(),
  trigger: z.string(),
  symptoms: z.array(z.string()),
  firstMoves: z.array(z.string()),
  linkedToolkits: z.array(linkSchema),
  linkedConcepts: z.array(linkSchema),
});

const decisionDomainCatalogSchema = z.object({
  postureDefinitions: z.array(postureDefinitionSchema),
  startSituations: z.tuple([
    z.literal("Hiring"),
    z.literal("Pricing"),
    z.literal("Roadmap"),
    z.literal("PMF"),
    z.literal("Launch"),
    z.literal("Governance"),
  ]),
  useCaseRoles: z.array(useCaseRoleSchema),
  situationUseCaseDefinitions: z.array(situationUseCaseSchema),
  situationRouting: z.record(z.enum(startSituations), z.enum(situationUseCaseSlugs)),
  toolkitDefinitions: z.array(toolkitDefinitionSchema),
  failureModes: z.tuple([
    z.literal("regime-mismatch"),
    z.literal("premature-scaling"),
    z.literal("irreversibility"),
    z.literal("proxy-lock-in"),
    z.literal("feedback-latency"),
    z.literal("portfolio-thrash"),
    z.literal("governance-theater"),
    z.literal("fragility-under-stress"),
    z.literal("complexity-debt"),
    z.literal("risk-externalization"),
  ]),
  failureModeDefinitions: z.array(failureModeDefinitionSchema),
});

export type ParsedDecisionDomainCatalog = z.infer<typeof decisionDomainCatalogSchema>;

export const parseDecisionDomainCatalog = (input: unknown): ParsedDecisionDomainCatalog => {
  const parsed = decisionDomainCatalogSchema.safeParse(input);

  if (parsed.success) {
    return parsed.data;
  }

  console.error("Decision domain catalog failed validation.", parsed.error.format());
  throw new Error("Decision domain catalog is invalid.");
};
