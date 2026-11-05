import type { Metadata } from "next";
import Link from "next/link";
import { buildGroupBreadcrumbs, toVisibleBreadcrumbs } from "../../lib/navigation/breadcrumbs";
import { toRoute } from "../../lib/navigation/routeType";
import { ROLES } from "../../lib/report/companyRoles";
import { conditionQuestions } from "../../lib/report/workQuestions";
import { buildPageMetadata } from "../../lib/seo";
import { buildHubStructuredData } from "../../lib/seo/pageStructuredData";
import { ConditionsSection } from "../companies/companyPageSections";
import { loadWeekConditions } from "../companies/loadCompanyPage";
import { JsonLdScript } from "../components/jsonLdScript";
import { Breadcrumbs } from "../components/ui/breadcrumbs";
import { ContentPageShell } from "../components/ui/contentPageShell";
import { ConditionQuestionsSection } from "./workQuestionsSections";

export const revalidate = 3600;

const title = "This week's conditions by role";
const description = "What this week's conditions mean for your job at any tech company: what to ask for, the general rules, and questions to ask leadership.";

export async function generateMetadata(): Promise<Metadata> {
  const { stale } = await loadWeekConditions();
  const metadata = buildPageMetadata({
    title,
    description,
    path: "/roles",
    imageAlt: title,
  });
  if (stale) metadata.robots = { index: false, follow: true };
  return metadata;
}

export default async function RolesPage() {
  const { conditions, regime } = await loadWeekConditions();
  return (
    <ContentPageShell>
      <JsonLdScript
        data={buildHubStructuredData({
          path: "/roles",
          name: title,
          description,
          items: ROLES.map((role) => ({ path: `/roles/${role.slug}`, name: role.title })),
        })}
      />
      <Breadcrumbs items={toVisibleBreadcrumbs(buildGroupBreadcrumbs(toRoute("/roles"), [{ name: "Roles", path: toRoute("/roles") }]))} />
      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h1 className="text-fluid-2xl font-semibold text-slate-100">This week&apos;s conditions by role</h1>
        <p className="text-sm text-slate-300">
          What to ask for this week and what to ask leadership, at any tech company. If yours is public,{" "}
          <Link href="/companies" className="underline decoration-slate-600 underline-offset-4 hover:text-slate-100">
            see what it has filed
          </Link>
          .
        </p>
        <ul className="weather-grid gap-x-4 gap-y-2 text-sm [--col-min:14rem]">
          {ROLES.map((role) => (
            <li key={role.slug}>
              <Link href={`/roles/${role.slug}`} className="weather-hit text-[var(--accent-action)] underline underline-offset-4">
                {role.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <ConditionsSection conditions={conditions} />
      <ConditionQuestionsSection regime={regime} questions={conditionQuestions(regime)} pagePath="/roles" />
    </ContentPageShell>
  );
}
