import type { Metadata } from "next";
import Link from "next/link";
import { COMPANIES } from "../../lib/companies/companyRegistry";
import { buildPageMetadata } from "../../lib/seo";
import { buildHubStructuredData } from "../../lib/seo/pageStructuredData";
import { JsonLdScript } from "../components/jsonLdScript";
import { SectionTabs } from "../components/sectionTabs";
import { ContentPageShell } from "../components/ui/contentPageShell";

const title = "What public tech companies have filed, by role";
const description = "What 50 public tech companies have filed, the decisions each role makes, and this week's conditions beside the figures.";

export const metadata: Metadata = buildPageMetadata({
  title,
  description,
  path: "/companies",
  imageAlt: "What public tech companies have filed, by role",
});

export default function CompaniesPage() {
  return (
    <ContentPageShell>
      <JsonLdScript
        data={buildHubStructuredData({
          path: "/companies",
          name: title,
          description,
          items: COMPANIES.map((company) => ({ path: `/companies/${company.slug}`, name: company.name })),
        })}
      />
      <SectionTabs currentPath="/companies" />
      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h1 className="text-fluid-2xl font-semibold text-slate-100">What public tech companies have filed, by role</h1>
        <p className="text-sm text-slate-300">
          The conditions are the same for everyone. What differs is the decisions each role makes and what each company has filed.
          Whether isn&apos;t affiliated with any of these companies. At a private company?{" "}
          <Link href="/roles" className="underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
            Start with your role
          </Link>
          .
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
