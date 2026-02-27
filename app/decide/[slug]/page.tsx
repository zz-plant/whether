import { redirectWithParams } from "../../../lib/navigation/legacyRedirects";

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
