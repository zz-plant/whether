import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../lib/seo";
import { toolkitDefinitions } from "../../../lib/informationArchitecture";
type Params = { slug: string };

export function generateStaticParams() {
  return toolkitDefinitions.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const toolkit = toolkitDefinitions.find((entry) => entry.slug === slug);
  if (!toolkit) return {};

  return buildPageMetadata({
    title: toolkit.title,
    description: toolkit.whenToUse,
    path: `/toolkits/${slug}`,
    imageAlt: toolkit.title,
  });
}

export default async function ToolkitDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const toolkit = toolkitDefinitions.find((entry) => entry.slug === slug);
  if (!toolkit) notFound();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">{toolkit.title}</h1>
        <p className="text-sm text-slate-300"><span className="font-semibold">When to use:</span> {toolkit.whenToUse}</p>
        <p className="text-sm text-slate-300"><span className="font-semibold">Posture split:</span> {toolkit.byPosture}</p>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Included instruments</h2>
        <ul className="space-y-2 text-sm text-slate-300">{toolkit.instruments.map((item) => <li key={item}>• {item}</li>)}</ul>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Common mistakes to avoid</h2>
        <ul className="space-y-2 text-sm text-slate-300">{toolkit.misuseCases.map((item) => <li key={item}>• {item}</li>)}</ul>
        <h2 className="pt-2 text-lg font-semibold text-slate-100">Canon references</h2>
        <div className="flex flex-wrap gap-2">{toolkit.canonLinks.map((link) => <Link key={link.href} href={link.href as Route} className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold text-slate-100">{link.label}</Link>)}</div>
      </section>
    </main>
  );
}
