import { permanentRedirect } from "next/navigation";

type BriefStageGuidePageProps = {
  params: Promise<{ stage: string }>;
};

export default async function BriefStageGuidePage({ params }: BriefStageGuidePageProps) {
  const { stage } = await params;
  permanentRedirect(`/guides/stage/${stage}`);
}
