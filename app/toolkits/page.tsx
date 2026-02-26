import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { toolkitDefinitions } from "../../lib/informationArchitecture";

export const metadata: Metadata = buildPageMetadata({
  title: "Toolkits — runnable instruments",
  description: "Use practical toolkits with checklists, templates, and misuse warnings.",
  path: "/toolkits",
  imageAlt: "Whether toolkits",
});

export default function ToolkitsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Toolkits</h1>
        <p className="text-sm text-slate-300">Each toolkit gives you concrete steps, what to avoid, and supporting references so your team can act with confidence.</p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        {toolkitDefinitions.map((toolkit) => (
          <Link key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} className="weather-panel space-y-2 px-4 py-4">
            <h2 className="text-base font-semibold text-slate-100">{toolkit.title}</h2>
            <p className="text-sm text-slate-300">{toolkit.whenToUse}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
