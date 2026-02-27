import { redirectWithParams } from "../../../lib/navigation/legacyRedirects";

export const runtime = "edge";

type PlanRouteParams = {
  slug: string;
};

export default function PlanDetailBridgePage({
  params,
}: {
  params: Promise<PlanRouteParams>;
}) {
  return redirectWithParams(params, ({ slug }) => `/toolkits/${slug}`);
}
