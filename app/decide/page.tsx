import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";
import { situationUseCases, useCaseRoles } from "../../lib/informationArchitecture";

export const metadata: Metadata = buildPageMetadata({
  title: "Decide — role and situation paths",
  description: "Choose guidance by role or situation, then run supporting decision tools.",
  path: "/decide",
  imageAlt: "Whether decision paths",
});

const titleCase = (value: string) => value
  .split("-")
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

export default function DecidePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-3 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Step 2 of 3 · choose path</p>
        <h1 className="text-2xl font-semibold text-slate-100 sm:text-3xl">Decision paths</h1>
        <p className="text-sm text-slate-300">Choose one entrypoint: role for a full decision map, or situation for the fastest route to next action.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/start" className="weather-button inline-flex items-center justify-center">Back to Start Here</Link>
          <Link href="/decide/ship-checklist" className="weather-pill inline-flex min-h-[44px] items-center justify-center px-4 py-2 text-xs font-semibold tracking-[0.12em] text-slate-100">Next: run ship checklist</Link>
        </div>
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

      <section className="weather-panel space-y-3 px-6 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Optional supporting tools</h2>
        <p className="text-sm text-slate-300">After choosing a role or situation path, use these only if you need additional validation for today&apos;s decision.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/signals" className="weather-panel space-y-2 px-4 py-4">
            <h2 className="text-lg font-semibold text-slate-100">Signals evidence</h2>
            <p className="text-sm text-slate-300">Check live evidence before committing to irreversible moves.</p>
          </Link>
          <Link href="/decide/ship-checklist" className="weather-panel space-y-2 px-4 py-4">
            <h2 className="text-lg font-semibold text-slate-100">Whether to ship checklist</h2>
            <p className="text-sm text-slate-300">Get a go/wait/kill recommendation tied to the current regime.</p>
          </Link>
          <Link href="/decide/team-context" className="weather-panel space-y-2 px-4 py-4">
            <h2 className="text-lg font-semibold text-slate-100">Team context profile</h2>
            <p className="text-sm text-slate-300">Personalize the mandate by stage, sector, and team size.</p>
          </Link>
        </div>
      </section>
    </main>
  );
}
