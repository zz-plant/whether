import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findCompany, type CompanyEntry } from "../../../../lib/companies/companyRegistry";
import { askForThisWeek, findCompanyRole, paybackBarLine, type CompanyRole } from "../../../../lib/report/companyRoles";
import { buildGroupBreadcrumbs, toVisibleBreadcrumbs } from "../../../../lib/navigation/breadcrumbs";
import { toRoute } from "../../../../lib/navigation/routeType";
import { buildPageMetadata } from "../../../../lib/seo";
import { ContentMeasurementTracker } from "../../../components/contentMeasurementTracker";
import { JsonLdScript } from "../../../components/jsonLdScript";
import { buildCompanyPageStructuredData } from "../../../../lib/seo/pageStructuredData";
import { Breadcrumbs } from "../../../components/ui/breadcrumbs";
import { ContentPageShell } from "../../../components/ui/contentPageShell";
import { CompanyNextLinks, CompanyPositionSection, ConditionsSection, RoleDecisionsSection } from "../../companyPageSections";
import { loadCompanyPage } from "../../loadCompanyPage";

type Params = { company: string; role: string };

export const dynamicParams = true;
export const revalidate = 3600;

/*
 * The role and the company first, in the words every link to this page uses ("Product managers at
 * Microsoft"). All 300 titles opened "This week's conditions for", which is what a result list shows
 * when it cuts a long title, and which tells these pages from nothing.
 */
const roleTitle = (role: CompanyRole, company: CompanyEntry) => `${role.title} at ${company.name}: this week's conditions`;
const roleDescription = (role: CompanyRole, company: CompanyEntry) =>
  `What this week's conditions mean for ${role.label} at ${company.name}: what to ask for, the general rules, and ${company.name}'s latest filed figures.`;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { company: companySlug, role: roleSlug } = await params;
  const company = findCompany(companySlug);
  const role = findCompanyRole(roleSlug);
  if (!company || !role) return {};
  const { indexable } = await loadCompanyPage(company);
  const metadata = buildPageMetadata({
    title: roleTitle(role, company),
    description: roleDescription(role, company),
    path: `/companies/${company.slug}/${role.slug}`,
    imageAlt: roleTitle(role, company),
  });
  if (!indexable) metadata.robots = { index: false, follow: true };
  return metadata;
}

export default async function CompanyRolePage({ params }: { params: Promise<Params> }) {
  const { company: companySlug, role: roleSlug } = await params;
  const company = findCompany(companySlug);
  const role = findCompanyRole(roleSlug);
  if (!company || !role) notFound();

  const { conditions, regime, situation, rules } = await loadCompanyPage(company);
  const path = `/companies/${company.slug}/${role.slug}`;
  return (
    <ContentPageShell data-content-measurement-root={path}>
      {/* Page by page, because whether this pilot grows turns on which of these earn visits. */}
      <ContentMeasurementTracker pagePath={path} cluster="authority" intent="vp-product" />
      <JsonLdScript
        data={buildCompanyPageStructuredData({
          path: `/companies/${company.slug}/${role.slug}`,
          title: roleTitle(role, company),
          description: roleDescription(role, company),
          company: company.name,
          ticker: company.ticker,
          cik: company.cik,
          audience: role.title,
          dateModifiedIso: conditions.recordDateIso,
          trail: [
            { name: "Companies", path: "/companies" },
            { name: company.name, path: `/companies/${company.slug}` },
            { name: role.title, path: `/companies/${company.slug}/${role.slug}` },
          ],
        })}
      />
      <Breadcrumbs
        items={toVisibleBreadcrumbs(
          buildGroupBreadcrumbs(toRoute(path), [
            { name: company.name, path: toRoute(`/companies/${company.slug}`) },
            { name: role.title, path: toRoute(path) },
          ]),
        )}
      />
      <section className="weather-panel space-y-2 px-6 max-sm:px-0 py-6">
        <h1 className="text-fluid-2xl font-semibold text-slate-100">This week&apos;s conditions for {role.label} at {company.name}</h1>
        <p className="text-sm text-slate-300">
          The same public signals every company reads, what {role.label} can ask for this week, and what {company.name} has filed.
        </p>
      </section>
      <ConditionsSection conditions={conditions} />
      <RoleDecisionsSection
        role={role}
        askFor={askForThisWeek(role, regime)}
        paybackBar={paybackBarLine(regime)}
        rules={role.areas.flatMap((area) => rules.filter((rule) => rule.area === area))}
      />
      {situation ? <CompanyPositionSection company={company} situation={situation} /> : null}
      <CompanyNextLinks company={company} role={role} />
    </ContentPageShell>
  );
}
