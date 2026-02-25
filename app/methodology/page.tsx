import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { MethodologyContent } from "../formulas/components/methodologyContent";

export const metadata: Metadata = buildPageMetadata({
  title: "Methodology — Whether",
  description: "Model logic and formulas only, with source-linked definitions.",
  path: "/methodology",
  imageAlt: "Whether methodology and formula reference",
});

export default function MethodologyPage() {
  return <MethodologyContent />;
}
