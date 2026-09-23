import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import {
  SecondaryPageHeader,
  SecondaryPageSection,
  SecondaryPageShell,
} from "../components/secondaryPageShell";
import { loadWeeklyBriefSnapshot } from "../../lib/report/weeklyBriefSnapshot";
import { DecisionShieldGlyph } from "../components/illustrations/DecisionShieldGlyph";
import { DecisionRecordPanel } from "./decisionRecordPanel";
import { DecisionRecordDownloads } from "./decisionRecordDownloads";
export const runtime = "edge";
export const revalidate = 900;
/**
 * What this browser decided, judged against this week's reading.
 *
 * The machinery for this page was written, tested and reachable by nobody.
 * `/api/decision-memory` stored an append-only ledger and exported it in a
 * citable record shape; `assessDecisionStaleness` returned STAND / WATCH /
 * RECONSIDER for an entry against current conditions; `/operate/memory` was
 * retired into a redirect at `/history`, which is the *published* archive and
 * says nothing about the reader. So the product whose argument is "here is the
 * call and here is the record behind it" kept a record of your calls and showed
 * it to the CLI.
 *
 * Deliberately `noindex`, and deliberately absent from the sitemap. There is
 * exactly one reader for whom this page has content, and a crawler is not it:
 * to anyone without this browser's identifier the page is its own empty state,
 * which is the thin-content case the quality gate already refuses elsewhere.
 * It stays `follow`, because every link on it goes somewhere worth crawling.
 *
 * The current reading is server-rendered and the ledger is not, which is the
 * split the ownership model forces: the entries are authorised by an opaque id
 * that exists only in local storage, and the market numbers are already here.
 */
export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "Your decision record",
    description:
      "The decisions recorded from this browser, each checked against this week's reading to say whether the conditions it relied on still hold.",
    path: "/decisions",
    imageAlt: "Whether decision record",
  }),
  robots: { index: false, follow: true },
};
export default async function DecisionsPage() {
  const { reportData } = await loadWeeklyBriefSnapshot(undefined, { route: "/decisions" });
  const scores = reportData.assessment.scores;
  return (
    <SecondaryPageShell width="standard">
      <SecondaryPageHeader
        eyebrow="Your record"
        title="Your decision record"
        description="Every decision you recorded, checked against this week's reading. A decision is only as good as the conditions it assumed, so this page tells you which of those have moved."
        aside={(
          <div className="weather-surface flex items-center gap-3.5 px-4 py-3.5">
            <DecisionShieldGlyph size={44} />
            <div className="space-y-0.5 text-xs text-slate-300">
              <p className="font-semibold text-slate-100">Your decision log</p>
              <p className="text-fluid-nano text-slate-400">Stored in this browser only. Not linked to you.</p>
            </div>
          </div>
        )}
      />
      <SecondaryPageSection
        title="Recorded from this browser"
        description="Stored against a random identifier in this browser and never joined to an email address. Clearing site data removes it."
      >
        <DecisionRecordPanel current={{ tightness: scores.tightness, riskAppetite: scores.riskAppetite }} />
      </SecondaryPageSection>
      <SecondaryPageSection
        title="Take it with you"
        description="The record is yours and leaves in a shape something else can read."
      >
        <DecisionRecordDownloads />
        <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
          The CSV is one row per decision, for a spreadsheet. The JSON file is one line per decision, oldest
          first, and each line carries a hash of the one before it, so the order cannot be rewritten after
          the fact. Reading the same record from a script is covered on the{" "}
          <Link href="/api-docs" className="text-sky-300 underline-offset-2 hover:underline">
            API page
          </Link>
          .
        </p>
      </SecondaryPageSection>
    </SecondaryPageShell>
  );
}
