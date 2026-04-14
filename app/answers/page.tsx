import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/seo";

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Answers — quick answers",
  description: "Legacy route for quick answers. Redirects to the narrowest answer path in Decision Tools.",
  path: "/answers",
  imageAlt: "Whether operator answer cluster",
  imagePath: "/social/answers.svg",
});

export default async function AnswersHubPage() {
  redirect("/decide#direct-answers");
}
