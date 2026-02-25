import { redirectWithParams } from "../../../lib/navigation/legacyRedirects";

export const runtime = "edge";

type BriefStakeholderPageProps = {
  params: Promise<{ stakeholder: string }>;
};

export default async function BriefStakeholderPage({ params }: BriefStakeholderPageProps) {
  return redirectWithParams(params, ({ stakeholder }) => `/guides/${stakeholder}`);
}
