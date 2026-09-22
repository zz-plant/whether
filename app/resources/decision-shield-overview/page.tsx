import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/pageMetadata";
import { noindexRobots } from "../../../lib/seo/indexationPolicy";

export const metadata: Metadata = buildPageMetadata({
  title: "Decision Shield Overview",
  description: "Decision Shield checks a plan against this week's call and says what would have to be true for it to be safe.",
  path: "/resources/decision-shield-overview",
  imageAlt: "Decision Shield overview",
});

metadata.robots = noindexRobots;

export default function DecisionShieldOverviewPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Decision Shield Overview</h1>
        <p className="text-sm text-slate-200">
          Decision Shield checks a plan against this week&apos;s call and says what would have to be true for it to be safe.
          It also says how hard the plan would be to undo, and keeps a record of what you decided.
        </p>
        <Link href="/operate" className="weather-button inline-flex items-center justify-center" data-conversion-event="demo/contact">
          Open Decision Shield in Planning
        </Link>
      </section>
    </main>
  );
}
