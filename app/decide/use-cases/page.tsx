import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../../lib/seo";
import { situationUseCases, useCaseRoles } from "../../../lib/informationArchitecture";

export const metadata: Metadata = buildPageMetadata({
  title: "Decide use cases — role and situation paths",
  description: "Find guidance written for your role or the decision in front of you.",
  path: "/decide/use-cases",
  imageAlt: "Whether decide use cases",
});

const titleCase = (value: string) => value
  .split("-")
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

export default function DecideUseCasesPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Use Cases</h1>
        <p className="text-sm text-slate-300">Choose one entrypoint only: role for a complete decision map, or situation for the fastest route to next action.</p>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Explore by role</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {useCaseRoles.map((role) => (
            <Link key={role.slug} href={`/decide/${role.slug}`} className="weather-surface px-4 py-4 text-sm font-semibold text-slate-100">{role.title}</Link>
          ))}
        </div>
      </section>
      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Explore by situation</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {situationUseCases.map((slug) => (
            <Link key={slug} href={`/decide/${slug}`} className="weather-surface px-4 py-4 text-sm text-slate-100">{titleCase(slug)}</Link>
          ))}
        </div>
      </section>
    </main>
  );
}
