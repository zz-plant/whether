import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/seo";
import { failureModes } from "../../../../lib/informationArchitecture";
type Params = { slug: string };

const titleCase = (value: string) => value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

export function generateStaticParams() {
  return failureModes.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  return buildPageMetadata({
    title: `Failure mode: ${titleCase(slug)}` ,
    description: "How to diagnose this failure mode and prevent it early.",
    path: `/library/failure-modes/${slug}` ,
    imageAlt: `Failure mode ${titleCase(slug)}` ,
  });
}

export default async function FailureModeDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  if (!failureModes.includes(slug as (typeof failureModes)[number])) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{titleCase(slug)}</h1>
        <p className="text-sm text-slate-300">Use this page to recognize the pattern, choose the right toolkit, and align your posture.</p>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">What to do next</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/toolkits" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Relevant toolkits</Link>
          <Link href="/posture" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Posture adjustment</Link>
          <Link href="/concepts" className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">Concept references</Link>
        </div>
      </section>
    </main>
  );
}
