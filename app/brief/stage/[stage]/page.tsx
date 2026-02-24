import { permanentRedirect } from "next/navigation";

export const runtime = "edge";

type BriefStageGuidePageProps = {
  params: Promise<{ stage: string }>;
};

export default async function BriefStageGuidePage({ params }: BriefStageGuidePageProps) {
  const { stage } = await params;
  permanentRedirect(`/guides/stage/${stage}`);
}
