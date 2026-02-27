import { redirectWithParams } from "../../../../lib/navigation/legacyRedirects";

export const runtime = "edge";

type FailureModeRouteParams = {
  slug: string;
};

export default function LearnFailureModeDetailPage({
  params,
}: {
  params: Promise<FailureModeRouteParams>;
}) {
  return redirectWithParams(params, ({ slug }) => `/library/failure-modes/${slug}`);
}
