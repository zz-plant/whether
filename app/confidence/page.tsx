import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { buildPageMetadata } from "../../lib/seo";

export const runtime = "edge";
export const revalidate = 900;

export const metadata: Metadata = buildPageMetadata({
  title: "Confidence and limits — Whether",
  description: "Confidence level, flip thresholds, and failure-mode checks for this week's operating posture.",
  path: "/confidence",
  imageAlt: "Whether confidence and limits",
});

export default function ConfidencePage() {
  permanentRedirect("/method#confidence-limits");
}
