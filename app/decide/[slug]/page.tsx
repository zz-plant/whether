import { redirectWithParams } from "../../../lib/navigation/legacyRedirects";

export const runtime = "edge";

type DecideRouteParams = {
  slug: string;
};

export default function DecideDetailBridgePage({
  params,
}: {
  params: Promise<DecideRouteParams>;
}) {
  return redirectWithParams(params, ({ slug }) => `/use-cases/${slug}`);
}
