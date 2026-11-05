import type { Metadata } from "next";
import Link from "next/link";
import { COMPANIES } from "../../lib/companies/companyRegistry";
import { buildGroupBreadcrumbs, toVisibleBreadcrumbs } from "../../lib/navigation/breadcrumbs";
import { toRoute } from "../../lib/navigation/routeType";
import { buildPageMetadata } from "../../lib/seo";
import { Breadcrumbs } from "../components/ui/breadcrumbs";
import { ContentPageShell } from "../components/ui/contentPageShell";

export const metadata: Metadata = buildPageMetadata({
  title: "This week's conditions by company and role",
  description: "This week's conditions, the decisions each role makes, and each company's latest filed figures, for 50 public companies.",
  path: "/companies",
  imageAlt: "This week's conditions by company and role",
});

export default function CompaniesPage() {
  return (
    <ContentPageShell>
      <Breadcrumbs items={toVisibleBreadcrumbs(buildGroupBreadcrumbs(toRoute("/companies"), [{ name: "Companies", path: toRoute("/companies") }]))} />
      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h1 className="text-fluid-2xl font-semibold text-slate-100">This week&apos;s conditions by company and role</h1>
        <p className="text-sm text-slate-300">
          The conditions are the same for everyone. What differs is the decisions each role makes and what each company has filed.
          Whether isn&apos;t affiliated with any of these companies.
        </p>
        <ul className="weather-grid gap-x-4 gap-y-2 text-sm [--col-min:10rem]">
          {COMPANIES.map((company) => (
            <li key={company.slug}>
              <Link href={`/companies/${company.slug}`} className="weather-hit text-[var(--accent-action)] underline underline-offset-4">
                {company.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </ContentPageShell>
  );
}
