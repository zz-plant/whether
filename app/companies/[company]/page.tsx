import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COMPANY_ROLES, findCompany } from "../../../lib/companies/companyRegistry";
import { buildGroupBreadcrumbs, toVisibleBreadcrumbs } from "../../../lib/navigation/breadcrumbs";
import { toRoute } from "../../../lib/navigation/routeType";
import { buildPageMetadata } from "../../../lib/seo";
import { ContentMeasurementTracker } from "../../components/contentMeasurementTracker";
import { JsonLdScript } from "../../components/jsonLdScript";
import { buildCompanyPageStructuredData } from "../../../lib/seo/pageStructuredData";
import { Breadcrumbs } from "../../components/ui/breadcrumbs";
import { ContentPageShell } from "../../components/ui/contentPageShell";
import { CompanyNextLinks, CompanyPositionSection, ConditionsSection } from "../companyPageSections";
import { loadCompanyPage } from "../loadCompanyPage";

type Params = { company: string };

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const company = findCompany((await params).company);
  if (!company) return {};
  const { indexable } = await loadCompanyPage(company);
  const metadata = buildPageMetadata({
    title: `${company.name}: this week's operating conditions and filed figures`,
    description: `This week's conditions, ${company.name}'s latest filed revenue, cash flow and debt, and guidance by role.`,
    path: `/companies/${company.slug}`,
    imageAlt: `${company.name}: this week's operating conditions`,
  });
  if (!indexable) metadata.robots = { index: false, follow: true };
  return metadata;
}

export default async function CompanyPage({ params }: { params: Promise<Params> }) {
  const company = findCompany((await params).company);
  if (!company) notFound();

  const { conditions, situation } = await loadCompanyPage(company);
  const path = `/companies/${company.slug}`;
  return (
    <ContentPageShell data-content-measurement-root={path}>
      <ContentMeasurementTracker pagePath={path} cluster="authority" intent="vp-product" />
      <JsonLdScript
        data={buildCompanyPageStructuredData({
          path: `/companies/${company.slug}`,
          title: `${company.name}: this week's conditions and filed figures`,
          company: company.name,
          ticker: company.ticker,
          trail: [
            { name: "Companies", path: "/companies" },
            { name: company.name, path: `/companies/${company.slug}` },
          ],
        })}
      />
      <Breadcrumbs
        items={toVisibleBreadcrumbs(
          buildGroupBreadcrumbs(toRoute(path), [
            { name: "Companies", path: toRoute("/companies") },
            { name: company.name, path: toRoute(path) },
          ]),
        )}
      />
      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h1 className="text-fluid-2xl font-semibold text-slate-100">{company.name}: this week&apos;s conditions and filed figures</h1>
        <ul className="space-y-1 text-sm">
          {COMPANY_ROLES.map((role) => (
            <li key={role.slug}>
              <Link href={`/companies/${company.slug}/${role.slug}`} className="weather-hit text-[var(--accent-action)] underline underline-offset-4">
                Guidance for {role.label} at {company.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <ConditionsSection conditions={conditions} />
      {situation ? <CompanyPositionSection company={company} situation={situation} /> : null}
      <CompanyNextLinks company={company} />
    </ContentPageShell>
  );
}
