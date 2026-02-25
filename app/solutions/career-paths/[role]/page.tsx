import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "../../../../lib/seo";
import { roleLandingBySlug, roleLandings } from "../roleLandingData";

const rolePageTitleSuffix = "career growth playbook";

export function generateStaticParams() {
  return roleLandings.map((role) => ({ role: role.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ role: string }>;
}): Promise<Metadata> {
  const { role } = await params;
  const roleLanding = roleLandingBySlug.get(role);

  if (!roleLanding) {
    return buildPageMetadata({
      title: "Role page not found — Whether",
      description: "This role page is unavailable.",
      path: "/",
      imageAlt: "Whether role page",
    });
  }

  return buildPageMetadata({
    title: `${roleLanding.roleTitle} ${rolePageTitleSuffix} — Whether`,
    description: roleLanding.summary,
    path: `/solutions/career-paths/${roleLanding.slug}`,
    imageAlt: `${roleLanding.roleTitle} promotion playbook`,
    imageParams: {
      template: "solutions",
      eyebrow: "Solution · Career pathways",
      title: roleLanding.roleTitle,
      subtitle: roleLanding.hero,
      kicker: "Whether role playbook.",
    },
  });
}

export default async function CareerPathRolePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  const roleLanding = roleLandingBySlug.get(role);

  if (!roleLanding) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Career growth playbook
        </p>
        <h1 className="max-w-3xl text-2xl font-semibold text-slate-100 sm:text-3xl">
          {roleLanding.roleTitle}
        </h1>
        <p className="max-w-3xl text-sm text-slate-300 sm:text-base">{roleLanding.summary}</p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">What you unlock in this role</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          {roleLanding.outcomes.map((outcome) => (
            <li key={outcome} className="weather-surface px-4 py-3">
              {outcome}
            </li>
          ))}
        </ul>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Signals you are operating at the next level</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          {roleLanding.proofPoints.map((point) => (
            <li key={point} className="weather-surface px-4 py-3">
              {point}
            </li>
          ))}
        </ul>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">How to run this weekly</h2>
        <p className="text-sm text-slate-300">
          Start with the weekly briefing for current climate context, then use Signals and
          Operations to convert market evidence into clear decisions and narrative-ready exports.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            See this week&apos;s market brief
          </Link>
          <Link
            href="/signals"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Inspect signal confidence
          </Link>
          <Link
            href="/operations"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Turn signals into execution plans
          </Link>
          <Link
            href="/guides"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Explore leadership guides
          </Link>
        </div>
      </section>
    </main>
  );
}
