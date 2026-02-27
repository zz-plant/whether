import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Plan — execution pathways",
  description: "Move from climate awareness into execution with operational playbooks and toolkits.",
  path: "/plan",
  imageAlt: "Whether plan hub",
});

export default function PlanPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Plan</h1>
        <p className="text-sm text-slate-300">Use planning surfaces that turn posture into concrete execution choices.</p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/operations" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Operations</h2>
          <p className="text-sm text-slate-300">See recommended operating pace and guardrails by posture.</p>
        </Link>
        <Link href="/plan/toolkits" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Execution toolkits</h2>
          <p className="text-sm text-slate-300">Use templates and checklists to turn strategy into execution.</p>
        </Link>
      </section>
    </main>
  );
}
