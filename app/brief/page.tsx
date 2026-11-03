import { redirect } from "next/navigation";
import { latestPublishedBrief, buildPublishedBriefPath } from "../../lib/report/publishedBriefs";

export default function BriefIndexPage() {
  const brief = latestPublishedBrief;
  if (brief) {
    redirect(buildPublishedBriefPath(brief.slug));
  }
  redirect("/");
}