import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { situationUseCases, useCaseRoles } from "../../lib/informationArchitecture";

export const metadata: Metadata = buildPageMetadata({
  title: "Use Cases — role and situation paths",
  description: "Find guidance written for your role or the decision in front of you.",
  path: "/use-cases",
  imageAlt: "Whether use cases",
});

const titleCase = (value: string) => value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

export default function UseCasesPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Use Cases</h1>
        <p className="text-sm text-slate-300">Start by role if you want a full decision map, or start by situation if you need a direct path to action.</p>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Explore by role</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {useCaseRoles.map((role) => (
            <Link key={role.slug} href={`/use-cases/${role.slug}`} className="weather-surface px-4 py-4 text-sm font-semibold text-slate-100">{role.title}</Link>
          ))}
        </div>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Explore by situation</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {situationUseCases.map((slug) => (
            <Link key={slug} href={`/use-cases/${slug}`} className="weather-surface px-4 py-4 text-sm text-slate-100">{titleCase(slug)}</Link>
          ))}
        </div>
      </section>
    </main>
  );
}
