import type { TrustStripProps } from "../components/trustStrip";

/**
 * The trust strip's four facts, from the snapshot every /operate route loads.
 * One mapping for the plan page and the two workstream pages, so the strip
 * under each h1 reads the same fields the same way.
 */
export const buildTrustStripProps = ({
  recordDateLabel,
  isFallback,
  sourcesLabel,
  confidenceLabel,
  transitionWatch,
}: {
  recordDateLabel: string;
  isFallback: boolean;
  /** `buildTrustStatus(...).trustStatusLabel`: the one phrase for how the sources answered. */
  sourcesLabel: string;
  confidenceLabel: TrustStripProps["confidenceLabel"];
  transitionWatch: "ON" | "OFF";
}): TrustStripProps => ({
  recordDateLabel,
  sourcesLive: !isFallback,
  sourcesLabel,
  confidenceLabel,
  couldChangeNextWeek: transitionWatch === "ON",
  href: "/trust",
});
