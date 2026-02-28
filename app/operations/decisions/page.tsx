import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Operations decisions — coming soon",
  description: "Decision-shield workflows are coming soon. Use the Operations playbook in the meantime.",
  path: "/operations/decisions",
  imageAlt: "Operations decisions coming soon",
});

export default function OperationsDecisionsPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Coming soon</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Operations decisions</h1>
        <p className="text-sm text-slate-300">Decision shield workflows are not available yet. Use the current operations playbook while this surface is in development.</p>
      </section>
      <section className="weather-panel flex flex-wrap gap-3 px-6 py-6">
        <Link href="/operations" className="weather-button inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em]">
          Open operations playbook
        </Link>
        <Link href="/method" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100">
          Review method
        </Link>
      </section>
    </main>
  );
}
