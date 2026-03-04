import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildBreadcrumbList, buildCanonicalUrl, buildPageMetadata, serializeJsonLd } from "../../../../lib/seo";
import { roleLandingBySlug, roleLandings } from "../roleLandingData";

const rolePageTitleSuffix = "career growth playbook";

export const dynamicParams = false;

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

  const peerRoles = roleLandings.filter((candidate) => candidate.slug !== roleLanding.slug);
  const levelingUpLoop = [
    `Use Whether to convert weekly macro shifts into clearer ${roleLanding.roleTitle} priorities.`,
    "Track confidence and trigger conditions so your recommendations hold up in exec review.",
    "Export concise, evidence-backed updates that prove judgment and leadership range.",
  ] as const;
  const rolePageStructuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${roleLanding.roleTitle} career growth playbook`,
    url: buildCanonicalUrl(`/solutions/career-paths/${roleLanding.slug}`),
    description: roleLanding.summary,
    about: [roleLanding.seniorityBand, roleLanding.scopeType],
  };

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    ...buildBreadcrumbList([
      { name: "Home", path: "/" },
      { name: "Solutions", path: "/solutions" },
      { name: "Career paths", path: "/solutions/career-paths" },
      { name: roleLanding.roleTitle, path: `/solutions/career-paths/${roleLanding.slug}` },
    ]),
  };

  const connectedWorkflow = [
    {
      title: "Product roadmapping",
      detail: "Use your weekly posture call to sequence roadmap bets with clearer risk boundaries.",
      href: "/solutions/product-roadmapping",
      cta: "Open product roadmapping",
    },
    {
      title: "Engineering capacity",
      detail: "Bring the same signal assumptions into hiring velocity and delivery commitment conversations.",
      href: "/solutions/engineering-capacity",
      cta: "Open engineering capacity",
    },
    {
      title: "Regime playbook",
      detail: "Connect your role-level decisions to executive keep, pause, and accelerate guardrails.",
      href: "/solutions/market-regime-playbook",
      cta: "Open regime playbook",
    },
  ] as const;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(rolePageStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbStructuredData) }}
      />
      <section className="weather-panel space-y-4 px-6 py-6">
        <Link
          href="/solutions/career-paths"
          className="inline-flex min-h-[44px] items-center text-xs font-semibold uppercase tracking-[0.12em] text-sky-300 transition-colors hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
        >
          ← Back to all role playbooks
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Career growth playbook
        </p>
        <h1 className="max-w-3xl text-2xl font-semibold text-slate-100 sm:text-3xl">
          {roleLanding.roleTitle}
        </h1>
        <p className="max-w-3xl text-sm text-slate-300 sm:text-base">{roleLanding.summary}</p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">How Whether helps you level up in this role</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          {levelingUpLoop.map((step) => (
            <li key={step} className="weather-surface px-4 py-3">
              {step}
            </li>
          ))}
        </ul>
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
        <h2 className="text-xl font-semibold text-slate-100">30/60/90-day execution plan</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="weather-surface space-y-2 px-4 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-100">First 30 days</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              {roleLanding.plan30_60_90.days30.map((step) => (
                <li key={step}>• {step}</li>
              ))}
            </ul>
          </article>
          <article className="weather-surface space-y-2 px-4 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-100">Days 31-60</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              {roleLanding.plan30_60_90.days60.map((step) => (
                <li key={step}>• {step}</li>
              ))}
            </ul>
          </article>
          <article className="weather-surface space-y-2 px-4 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-100">Days 61-90</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              {roleLanding.plan30_60_90.days90.map((step) => (
                <li key={step}>• {step}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Promotion packet template</h2>
        <p className="text-sm text-slate-300">
          Use this structure when writing impact narratives for your manager, promotion panel, or calibration review.
        </p>
        <ul className="space-y-2 text-sm text-slate-200">
          {roleLanding.promotionPacketTemplate.map((section) => (
            <li key={section} className="weather-surface px-4 py-3">
              {section}
            </li>
          ))}
        </ul>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">How to run this weekly</h2>
        <ol className="space-y-2 text-sm text-slate-200">
          <li className="weather-surface px-4 py-3">
            Start with the weekly briefing to anchor your planning in the latest climate posture.
          </li>
          <li className="weather-surface px-4 py-3">
            Validate your assumptions in Signals before finalizing trade-offs or escalation asks.
          </li>
          <li className="weather-surface px-4 py-3">
            Use Operations to assign owners, trigger conditions, and review cadence.
          </li>
          <li className="weather-surface px-4 py-3">
            Export concise updates so leadership sees confidence, risk, and rationale in one place.
          </li>
        </ol>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            See this week&apos;s market brief
          </Link>
          <Link
            href="/evidence"
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
            href="/decide"
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Explore decision pathways
          </Link>
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Explore other career paths</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {peerRoles.map((peerRole) => (
            <article key={peerRole.slug} className="weather-surface flex h-full flex-col gap-3 px-4 py-4">
              <h3 className="text-base font-semibold text-slate-100">{peerRole.roleTitle}</h3>
              <p className="text-sm text-slate-300">{peerRole.hero}</p>
              <Link
                href={`/solutions/career-paths/${peerRole.slug}`}
                className="weather-pill mt-auto inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                View this role
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Connect this role to cross-functional workflows</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {connectedWorkflow.map((workflow) => (
            <article key={workflow.href} className="weather-surface flex h-full flex-col gap-3 px-4 py-4">
              <h3 className="text-base font-semibold text-slate-100">{workflow.title}</h3>
              <p className="text-sm text-slate-300">{workflow.detail}</p>
              <Link
                href={workflow.href}
                className="weather-pill mt-auto inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                {workflow.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
