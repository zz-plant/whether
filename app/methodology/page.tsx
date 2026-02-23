import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import { MethodologyContent } from "../formulas/components/methodologyContent";

export const metadata: Metadata = buildPageMetadata({
  title: "Methodology — Whether",
  description: "Sensor formulas and source links for macro signal calculations.",
  path: "/methodology",
  imageAlt: "Whether methodology and formula reference",
});

export default function MethodologyPage() {
  return <MethodologyContent />;
}
