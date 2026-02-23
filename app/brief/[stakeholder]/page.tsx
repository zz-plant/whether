import { permanentRedirect } from "next/navigation";

type BriefStakeholderPageProps = {
  params: Promise<{ stakeholder: string }>;
};

export default async function BriefStakeholderPage({ params }: BriefStakeholderPageProps) {
  const { stakeholder } = await params;
  permanentRedirect(`/guides/${stakeholder}`);
}
