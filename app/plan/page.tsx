import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Plan — execution workflows",
  description: "Turn current posture into role-based and scenario-based execution plans.",
  path: "/plan",
  imageAlt: "Whether plan hub",
});

export default function PlanPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Plan</h1>
        <p className="text-sm text-slate-300">
          Build execution plans based on your role, operating constraint, and current market posture.
        </p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/use-cases" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-base font-semibold text-slate-100">Use Cases</h2>
          <p className="text-sm text-slate-300">Role and situation pathways into practical decisions.</p>
        </Link>
        <Link href="/solutions/career-paths" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-base font-semibold text-slate-100">Career Paths</h2>
          <p className="text-sm text-slate-300">Role-specific growth plans and operational expectations.</p>
        </Link>
        <Link href="/toolkits" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-base font-semibold text-slate-100">Execution Toolkits</h2>
          <p className="text-sm text-slate-300">Templates and checklists to operationalize decisions.</p>
        </Link>
      </section>
      <section className="weather-panel flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm">
        <p className="text-slate-300">Need supporting rationale for your plan?</p>
        <div className="flex gap-2">
          <Link href="/decide" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2">Back to Decide</Link>
          <Link href="/learn" className="weather-chip inline-flex min-h-[44px] items-center px-3 py-2">Open Learn</Link>
        </div>
      </section>
    </main>
  );
}
