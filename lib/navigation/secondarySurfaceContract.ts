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
    intentLabel: "Translate the call by role or stage",
    parentHubHref: "/decide",
    parentHubLabel: "Decision Tools",
    returnCtaLabel: "Return to Decision Tools",
    helperSummary: "Use guides after reviewing the weekly brief to adapt the call for one role or company stage.",
  },
  resources: {
    surfaceKey: "resources",
    intentLabel: "Prepare a deeper board or governance artifact",
    parentHubHref: "/operations",
    parentHubLabel: "Planning",
    returnCtaLabel: "Return to Planning",
    helperSummary: "Use resources after the weekly brief when leadership needs deeper governance artifacts and templates.",
  },
  answers: {
    surfaceKey: "answers",
    intentLabel: "Get a direct answer to one question",
    parentHubHref: "/decide",
    parentHubLabel: "Decision Tools",
    returnCtaLabel: "Return to Decision Tools",
    helperSummary: "Use answers after the weekly brief when one specific yes-or-no question still needs a shareable answer.",
  },
  concepts: {
    surfaceKey: "concepts",
    intentLabel: "Pressure-test a framework against this regime",
    parentHubHref: "/method",
    parentHubLabel: "Trust",
    returnCtaLabel: "Return to Trust",
    helperSummary: "Use concepts after the weekly brief to check whether a framework still holds under current evidence.",
  },
};
