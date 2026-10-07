import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/seo";
import { noindexRobots } from "../../../lib/seo/indexationPolicy";
import { ContentPageShell } from "../../components/ui/contentPageShell";

export const metadata: Metadata = buildPageMetadata({
  title: "Decision Shield Overview",
  description: "Decision Shield checks a plan against this week's guidance and says what would have to be true for it to be safe.",
  path: "/resources/decision-shield-overview",
  imageAlt: "Decision Shield overview",
});

metadata.robots = noindexRobots;

export default function DecisionShieldOverviewPage() {
  return (
    <ContentPageShell measure="prose">
      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Decision Shield Overview</h1>
        <p className="text-sm text-slate-200">
          Decision Shield checks a plan against this week&apos;s guidance and says what would have to be true for it to be safe.
          It also says how hard the plan would be to undo, and keeps a record of what you decided.
        </p>
        <Link href="/operate" className="weather-button inline-flex items-center justify-center" data-conversion-event="demo/contact">
          Open Decision Shield in the plan
        </Link>
      </section>
    </ContentPageShell>
  );
}
