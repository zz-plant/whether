import { permanentRedirect } from "next/navigation";

type RedirectTarget = Parameters<typeof permanentRedirect>[0];

export type LegacyRedirect = {
  legacyPath: `/${string}`;
  targetPath: `/${string}`;
};

export const legacyRedirects = [
  {
    legacyPath: "/from-hiring-freeze-to-selective-offense",
    targetPath: "/answers/from-hiring-freeze-to-selective-offense",
  },
  {
    legacyPath: "/how-to-operate-in-expansion-mode-startup",
    targetPath: "/answers/how-to-operate-in-expansion-mode-startup",
  },
  {
    legacyPath: "/is-it-risk-on-or-risk-off-for-startups",
    targetPath: "/answers/is-it-risk-on-or-risk-off-for-startups",
  },
  {
    legacyPath: "/product-strategy-in-a-risk-off-market",
    targetPath: "/answers/product-strategy-in-a-risk-off-market",
  },
  {
    legacyPath: "/should-startups-raise-capital-now",
    targetPath: "/answers/should-startups-raise-capital-now",
  },
  {
    legacyPath: "/should-startups-slow-product-development",
    targetPath: "/answers/should-startups-slow-product-development",
  },
  {
    legacyPath: "/should-startups-slow-roadmap-expansion",
    targetPath: "/answers/should-startups-slow-roadmap-expansion",
  },
  {
    legacyPath: "/should-we-hire-engineers-right-now",
    targetPath: "/answers/should-we-hire-engineers-right-now",
  },
  {
    legacyPath: "/startup-funding-climate-this-week",
    targetPath: "/answers/startup-funding-climate-this-week",
  },
  {
    legacyPath: "/startup-market-outlook",
    targetPath: "/answers/startup-market-outlook",
  },
  {
    legacyPath: "/startup-strategy-during-capital-scarcity",
    targetPath: "/answers/startup-strategy-during-capital-scarcity",
  },
  {
    legacyPath: "/when-should-startups-cut-burn",
    targetPath: "/answers/when-should-startups-cut-burn",
  },
] as const satisfies readonly LegacyRedirect[];

const legacyRedirectMap = new Map<string, string>(
  legacyRedirects.map(({ legacyPath, targetPath }) => [legacyPath, targetPath]),
);

export const resolveLegacyRedirectPath = (legacyPath: string): string | null => {
  return legacyRedirectMap.get(legacyPath) ?? null;
};

export const resolveLegacyRedirectSlug = (legacySlug: string): string | null => {
  return resolveLegacyRedirectPath(`/${legacySlug}`);
};

export const redirectTo = (targetPath: string): never => {
  permanentRedirect(targetPath as RedirectTarget);
};

export const redirectWithParams = async <TParams extends Record<string, string>>(
  paramsPromise: Promise<TParams>,
  resolveTargetPath: (params: TParams) => string,
): Promise<never> => {
  const params = await paramsPromise;
  permanentRedirect(resolveTargetPath(params) as RedirectTarget);
};

export const redirectLegacyAnswer = (slug: string): never => {
  return redirectTo(`/answers/${slug}`);
};
