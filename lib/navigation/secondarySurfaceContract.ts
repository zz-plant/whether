import type { Route } from "./routeType";

export type SecondarySurfaceContract = {
  surfaceKey: "guides" | "resources" | "answers" | "concepts";
  intentLabel: string;
  parentHubHref: Route;
  parentHubLabel: string;
  returnCtaLabel: string;
  helperSummary: string;
  startInstruction: string;
};

export const secondarySurfaceContractByKey: Record<SecondarySurfaceContract["surfaceKey"], SecondarySurfaceContract> = {
  guides: {
    surfaceKey: "guides",
    intentLabel: "Translate the call by role or stage",
    parentHubHref: "/decide",
    parentHubLabel: "Decision Tools",
    returnCtaLabel: "Return to Decision Tools",
    helperSummary: "Use guides only after Decision Tools has narrowed the open question to one team, leader, or stage translation.",
    startInstruction: "Route the question in Decision Tools, then open this helper surface.",
  },
  resources: {
    surfaceKey: "resources",
    intentLabel: "Prepare a deeper board or governance artifact",
    parentHubHref: "/operations",
    parentHubLabel: "Planning",
    returnCtaLabel: "Return to Planning",
    helperSummary: "Use resources only after Planning is already directionally clear and leadership still needs a deeper governance artifact or template.",
    startInstruction: "Approve the plan in Planning, then open this helper surface.",
  },
  answers: {
    surfaceKey: "answers",
    intentLabel: "Get a direct answer to one question",
    parentHubHref: "/decide",
    parentHubLabel: "Decision Tools",
    returnCtaLabel: "Return to Decision Tools",
    helperSummary: "Use answers only after Decision Tools has narrowed the remaining question to one direct, shareable yes-or-no answer.",
    startInstruction: "Route the question in Decision Tools, then open this helper surface.",
  },
  concepts: {
    surfaceKey: "concepts",
    intentLabel: "Pressure-test a framework against this regime",
    parentHubHref: "/method",
    parentHubLabel: "Trust",
    returnCtaLabel: "Return to Trust",
    helperSummary: "Use concepts only after the weekly call is clear and you need supporting framework context to pressure-test language, not to replace the call itself.",
    startInstruction: "Confirm the live call first, then open this helper surface.",
  },
};
