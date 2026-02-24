import { permanentRedirect } from "next/navigation";

export const runtime = "edge";

type BriefStakeholderPageProps = {
  params: Promise<{ stakeholder: string }>;
};

export default async function BriefStakeholderPage({ params }: BriefStakeholderPageProps) {
  const { stakeholder } = await params;
  permanentRedirect(`/guides/${stakeholder}`);
}
