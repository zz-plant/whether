import type { Route } from "./routeType";

export type SecondarySurfaceContract = {
  surfaceKey: "guides" | "resources" | "answers" | "concepts";
  intentLabel: string;
  parentHubHref: Route;
  parentHubLabel: string;
  returnCtaLabel: string;
  helperSummary: string;
};

export const secondarySurfaceContractByKey: Record<SecondarySurfaceContract["surfaceKey"], SecondarySurfaceContract> = {
  guides: {
    surfaceKey: "guides",
    intentLabel: "Role and stage translation",
    parentHubHref: "/decide",
    parentHubLabel: "Decision Tools",
    returnCtaLabel: "Return to Decision Tools",
    helperSummary: "Use guides after reviewing the weekly brief to turn posture into role- and stage-specific calls.",
  },
  resources: {
    surfaceKey: "resources",
    intentLabel: "Board-ready long-form artifacts",
    parentHubHref: "/operations",
    parentHubLabel: "Planning",
    returnCtaLabel: "Return to Planning",
    helperSummary: "Use resources after the weekly brief when leadership needs deeper governance artifacts and templates.",
  },
  answers: {
    surfaceKey: "answers",
    intentLabel: "Single-question decision extracts",
    parentHubHref: "/decide",
    parentHubLabel: "Decision Tools",
    returnCtaLabel: "Return to Decision Tools",
    helperSummary: "Use answers after the weekly brief for one-question, shareable downstream decision support.",
  },
  concepts: {
    surfaceKey: "concepts",
    intentLabel: "Framework context for current regime",
    parentHubHref: "/method",
    parentHubLabel: "Trust",
    returnCtaLabel: "Return to Trust",
    helperSummary: "Use concepts after the weekly brief to pressure-test language and frameworks against current regime evidence.",
  },
};
