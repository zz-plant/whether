import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/seo";

export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Answers — one operating question at a time",
  description: "Downstream answer library for one operating question after Decision Tools has already narrowed what needs answering.",
  path: "/answers",
  imageAlt: "Whether operator answer cluster",
  imagePath: "/social/answers.svg",
});

export default function AnswersHubPage() {
  permanentRedirect("/decide#direct-answers");
}
