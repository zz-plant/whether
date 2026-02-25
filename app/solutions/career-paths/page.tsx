import type { Metadata } from "next";
import Link from "next/link";
import { buildCanonicalUrl, buildPageMetadata, serializeJsonLd } from "../../../lib/seo";
import { roleLandings, type ScopeType, type SeniorityBand } from "./roleLandingData";

export const dynamic = "force-static";

export const metadata: Metadata = buildPageMetadata({
  title: "Career paths for product leaders — Whether",
  description:
    "Choose a product leadership career path and use market-regime signals to sharpen planning, trade-offs, and promotion-ready operating habits.",
  path: "/solutions/career-paths",
  imageAlt: "Career paths for product leaders",
  imageParams: {
    template: "solutions",
    eyebrow: "Solution · Career pathways",
    title: "Market-aware career growth for product leaders",
    subtitle:
      "Pick your current scope and get practical outcomes, proof points, and weekly operating loops.",
    kicker: "Whether career path playbooks.",
  },
});

const operatingRhythm = [
  "Read the weekly climate summary before roadmap or portfolio planning.",
  "Translate the signal posture into one clear keep / pause / accelerate call.",
  "Document trade-offs with confidence levels and trigger conditions.",
  "Share concise updates leadership can review without custom slide work.",
] as const;

const levelingUpReasons = [
  {
    title: "Make stronger calls under pressure",
    description:
      "Whether gives you confidence-scored context so your prioritization and staffing decisions stay durable in leadership review.",
  },
  {
    title: "Show strategic judgment, not just delivery",
    description:
      "Use regime-aware narratives to explain why you changed course, what risks you accepted, and what signal would trigger your next move.",
  },
  {
    title: "Build a promotion-ready operating cadence",
    description:
      "Turn weekly market evidence into crisp updates that demonstrate judgment, communication quality, and cross-functional alignment.",
  },
] as const;

const connectedSolutions = [
  {
    title: "Product roadmapping",
    description:
      "Translate macro posture into roadmap sequencing choices and quarterly prioritization trade-offs.",
    href: "/solutions/product-roadmapping",
    cta: "Connect to product roadmapping",
  },
  {
    title: "Engineering capacity",
    description:
      "Pressure-test staffing plans and delivery commitments with the same signal baseline your product org uses.",
    href: "/solutions/engineering-capacity",
    cta: "Connect to engineering capacity",
  },
  {
    title: "Market regime playbook",
    description:
      "Align executive-level keep / pause / accelerate decisions across product, engineering, and finance.",
    href: "/solutions/market-regime-playbook",
    cta: "Connect to regime playbook",
  },
] as const;

type CareerPathsPageProps = {
  searchParams: Promise<{
    seniority?: SeniorityBand | "all";
    scope?: ScopeType | "all";
    compare?: string;
  }>;
};

const compareSlugSet = (compareParam: string | undefined) => {
  if (!compareParam) {
    return new Set<string>();
  }

  return new Set(
    compareParam
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .slice(0, 2),
  );
};

const renderCompareCell = (label: string, values: string[]) => (
  <tr key={label}>
    <th className="border border-slate-700 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
      {label}
    </th>
    {values.map((value, index) => (
      <td key={`${label}-${index}`} className="border border-slate-700 px-3 py-2 text-sm text-slate-200">
        {value}
      </td>
    ))}
  </tr>
);

export default async function CareerPathsPage({ searchParams }: CareerPathsPageProps) {
  const { seniority = "all", scope = "all", compare } = await searchParams;
  const compareSet = compareSlugSet(compare);

  const filteredRoles = roleLandings.filter((role) => {
    const matchesSeniority = seniority === "all" || role.seniorityBand === seniority;
    const matchesScope = scope === "all" || role.scopeType === scope;

    return matchesSeniority && matchesScope;
  });

  const selectedRolesForCompare = roleLandings.filter((role) => compareSet.has(role.slug)).slice(0, 2);
  const compareEnabled = selectedRolesForCompare.length === 2;

  const careerPathsStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Career paths for product leaders",
    url: buildCanonicalUrl("/solutions/career-paths"),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: filteredRoles.map((role, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: role.roleTitle,
        url: buildCanonicalUrl(`/solutions/career-paths/${role.slug}`),
      })),
    },
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(careerPathsStructuredData) }}
      />
      <section className="weather-panel space-y-4 px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          Career growth playbooks
        </p>
        <h1 className="max-w-3xl text-2xl font-semibold text-slate-100 sm:text-3xl">
          Career paths for product leaders operating through market volatility.
        </h1>
        <p className="max-w-3xl text-sm text-slate-300 sm:text-base">
          Each role page translates macro signals into day-to-day operating moves so you can improve
          decision quality, communicate trade-offs clearly, and level up with visible evidence.
        </p>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Role filters and compare</h2>
        <form action="/solutions/career-paths" method="get" className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
            Seniority band
            <select
              name="seniority"
              defaultValue={seniority}
              className="min-h-[44px] w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-100"
            >
              <option value="all">All bands</option>
              <option value="Senior">Senior</option>
              <option value="Lead">Lead</option>
              <option value="Director+">Director+</option>
              <option value="Strategy">Strategy</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
            Scope type
            <select
              name="scope"
              defaultValue={scope}
              className="min-h-[44px] w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-100"
            >
              <option value="all">All scopes</option>
              <option value="Single-team">Single-team</option>
              <option value="Multi-team">Multi-team</option>
              <option value="Org-wide">Org-wide</option>
              <option value="Company-wide">Company-wide</option>
            </select>
          </label>
          <input type="hidden" name="compare" value={compare ?? ""} />
          <div className="sm:col-span-2 flex flex-wrap gap-3">
            <button
              type="submit"
              className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold tracking-[0.12em]"
            >
              Apply filters
            </button>
            <Link
              href="/solutions/career-paths"
              className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100"
            >
              Reset
            </Link>
            <p className="inline-flex min-h-[44px] items-center text-sm text-slate-300">
              {filteredRoles.length} role{filteredRoles.length === 1 ? "" : "s"} shown.
            </p>
          </div>
        </form>
      </section>

      {compareEnabled ? (
        <section className="weather-panel space-y-4 px-6 py-6">
          <h2 className="text-xl font-semibold text-slate-100">Role comparison</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-slate-700 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                    Attribute
                  </th>
                  {selectedRolesForCompare.map((role) => (
                    <th
                      key={role.slug}
                      className="border border-slate-700 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-300"
                    >
                      {role.roleTitle}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {renderCompareCell(
                  "Seniority",
                  selectedRolesForCompare.map((role) => role.seniorityBand),
                )}
                {renderCompareCell("Scope", selectedRolesForCompare.map((role) => role.scopeType))}
                {renderCompareCell(
                  "Primary outcome",
                  selectedRolesForCompare.map((role) => role.outcomes[0] ?? "—"),
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">How Whether helps you level up faster</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {levelingUpReasons.map((reason) => (
            <article key={reason.title} className="weather-surface space-y-2 px-4 py-4">
              <h3 className="text-base font-semibold text-slate-100">{reason.title}</h3>
              <p className="text-sm text-slate-300">{reason.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Choose your current role</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredRoles.map((roleLanding) => {
            const nextCompare = new Set(compareSet);
            if (nextCompare.has(roleLanding.slug)) {
              nextCompare.delete(roleLanding.slug);
            } else if (nextCompare.size < 2) {
              nextCompare.add(roleLanding.slug);
            }

            const compareParam = [...nextCompare].join(",");

            return (
              <article key={roleLanding.slug} className="weather-surface flex h-full flex-col gap-3 px-4 py-4">
                <h3 className="text-base font-semibold text-slate-100">{roleLanding.roleTitle}</h3>
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                  {roleLanding.seniorityBand} · {roleLanding.scopeType}
                </p>
                <p className="text-sm text-slate-300">{roleLanding.hero}</p>
                <p className="text-sm text-slate-300">{roleLanding.summary}</p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Link
                    href={`/solutions/career-paths/${roleLanding.slug}`}
                    className="weather-button-primary inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.1em]"
                  >
                    Open {roleLanding.roleTitle} playbook
                  </Link>
                  <Link
                    href={`/solutions/career-paths?seniority=${encodeURIComponent(seniority)}&scope=${encodeURIComponent(scope)}&compare=${encodeURIComponent(compareParam)}`}
                    className="weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100"
                  >
                    {compareSet.has(roleLanding.slug) ? "Remove from compare" : "Add to compare"}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Weekly operating rhythm</h2>
        <ul className="space-y-2 text-sm text-slate-200">
          {operatingRhythm.map((step) => (
            <li key={step} className="weather-surface px-4 py-3">
              {step}
            </li>
          ))}
        </ul>
      </section>

      <section className="weather-panel space-y-4 px-6 py-6">
        <h2 className="text-xl font-semibold text-slate-100">Connect role growth to team execution</h2>
        <p className="text-sm text-slate-300">
          Career progress compounds faster when your individual operating habits connect directly to
          team-level planning workflows.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {connectedSolutions.map((solution) => (
            <article key={solution.href} className="weather-surface flex h-full flex-col gap-3 px-4 py-4">
              <h3 className="text-base font-semibold text-slate-100">{solution.title}</h3>
              <p className="text-sm text-slate-300">{solution.description}</p>
              <Link
                href={solution.href}
                className="weather-pill mt-auto inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.1em] text-slate-100 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
              >
                {solution.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
