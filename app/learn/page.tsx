import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Learn — concepts and references",
  description: "Browse toolkits, concepts, and diagnostics that explain why and when guidance applies.",
  path: "/learn",
  imageAlt: "Whether learn hub",
});

export default function LearnPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Learn</h1>
        <p className="text-sm text-slate-300">
          Use references and concepts to sharpen judgment, then jump back into decisions and planning.
        </p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/toolkits" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-base font-semibold text-slate-100">Toolkits</h2>
          <p className="text-sm text-slate-300">Runnable templates, checklists, and misuse warnings.</p>
        </Link>
        <Link href="/library" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-base font-semibold text-slate-100">Library</h2>
          <p className="text-sm text-slate-300">Failure modes and canon references for deeper reasoning.</p>
        </Link>
        <Link href="/concepts" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-base font-semibold text-slate-100">Concepts</h2>
          <p className="text-sm text-slate-300">Timeline-based concept context and evidence framing.</p>
        </Link>
        <Link href="/guides" className="weather-panel space-y-2 px-4 py-4">
          <h2 className="text-base font-semibold text-slate-100">Guides</h2>
          <p className="text-sm text-slate-300">Role and stage guidance for common operating scenarios.</p>
        </Link>
      </section>
    </main>
  );
}
