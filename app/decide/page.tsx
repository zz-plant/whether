import type { Metadata } from "next";
import Link from "next/link";
import { buildPageMetadata } from "../../lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Role Lenses — reference library",
  description: "Role lens library for product, engineering, finance, and leadership decision references.",
  path: "/decide",
  imageAlt: "Whether role lens library",
});

export default function DecidePage() {
  const roleLensCards = [
    {
      href: "/decide/use-cases",
      title: "Role and situation paths",
      description: "Choose by role or scenario to reach the right guidance quickly.",
      eyebrow: "Routing",
      accentClass: "weather-card-accent-sky",
    },
    {
      href: "/evidence",
      title: "Signals evidence",
      description: "Check live evidence before committing to irreversible moves.",
      eyebrow: "Validation",
      accentClass: "weather-card-accent-teal",
    },
    {
      href: "/decide/ship-checklist",
      title: "Whether to ship checklist",
      description: "Get a go/wait/kill recommendation tied to the current regime.",
      eyebrow: "Decision",
      accentClass: "weather-card-accent-amber",
    },
    {
      href: "/decide/team-context",
      title: "Team context profile",
      description: "Personalize the mandate by stage, sector, and team size.",
      eyebrow: "Calibration",
      accentClass: "weather-card-accent-violet",
    },
  ] as const;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel-hero space-y-3 px-6 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Role translation layer</p>
        <h1 className="type-section text-slate-100">Role lens library</h1>
        <p className="text-[15px] text-slate-300 sm:text-base">Command Center is the primary start page. Use this library when you need deeper role-specific references after selecting posture and situation.</p>
        <div>
          <Link href="/start" className="weather-button-primary inline-flex items-center justify-center">Back to Command Center</Link>
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {roleLensCards.map((card) => (
          <Link key={card.href} href={card.href} className={`weather-panel weather-card-accent ${card.accentClass} space-y-2 px-4 py-3`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{card.eyebrow}</p>
            <h2 className="text-lg font-semibold text-slate-100">{card.title}</h2>
            <p className="text-[15px] text-slate-300 sm:text-base">{card.description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
