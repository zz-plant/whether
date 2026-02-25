import { redirectWithParams } from "../../../../lib/navigation/legacyRedirects";

export const runtime = "edge";

type BriefStageGuidePageProps = {
  params: Promise<{ stage: string }>;
};

export default async function BriefStageGuidePage({ params }: BriefStageGuidePageProps) {
  return redirectWithParams(params, ({ stage }) => `/guides/stage/${stage}`);
}
