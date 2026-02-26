import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/seo";
import { failureModes } from "../../../lib/informationArchitecture";

export const metadata: Metadata = buildPageMetadata({
  title: "Failure Modes library",
  description: "Diagnostic pages that show what's going wrong and where to go next.",
  path: "/library/failure-modes",
  imageAlt: "Failure modes library",
});

const titleCase = (value: string) => value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

export default function FailureModesPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Failure Modes</h1>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        {failureModes.map((slug) => (
          <Link key={slug} href={`/library/failure-modes/${slug}`} className="weather-panel px-4 py-4 text-sm font-semibold text-slate-100">{titleCase(slug)}</Link>
        ))}
      </section>
    </main>
  );
}
