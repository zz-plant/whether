import type { Metadata } from "next";
import { buildPageMetadata } from "../../lib/seo";
import SignalsPage from "../signals/page";

export const metadata: Metadata = buildPageMetadata({
  title: "Whether Report — Signal evidence",
  description:
    "Macro signals, sensor detail, thresholds, and historical context for Whether Market Climate Station.",
  path: "/evidence",
  imageAlt: "Whether Report signal evidence overview",
});

export const runtime = "edge";
export const revalidate = 900;

export default async function EvidencePage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string;
    year?: string;
    [key: string]: string | undefined;
  }>;
}) {
  return <SignalsPage searchParams={searchParams} />;
}
