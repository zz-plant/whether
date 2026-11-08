import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildGroupBreadcrumbs, toVisibleBreadcrumbs } from "../../../lib/navigation/breadcrumbs";
import { toRoute } from "../../../lib/navigation/routeType";
import { buildPageMetadata } from "../../../lib/seo";
import { askForThisWeek, findRole, paybackBarLine, ROLES } from "../../../lib/report/companyRoles";
import { ROLE_STAGES, stageForWorkers } from "../../../lib/report/roleStages";
import { conditionQuestionForRole, workSituationsForRole } from "../../../lib/report/workQuestions";
import { buildRolePageStructuredData } from "../../../lib/seo/pageStructuredData";
import { ConditionsSection, RoleDecisionsSection } from "../../companies/companyPageSections";
import { loadWeekConditions } from "../../companies/loadCompanyPage";
import { ContentMeasurementTracker } from "../../components/contentMeasurementTracker";
import { JsonLdScript } from "../../components/jsonLdScript";
import { ActionLink } from "../../components/ui/actionLink";
import { Breadcrumbs } from "../../components/ui/breadcrumbs";
import { ContentPageShell } from "../../components/ui/contentPageShell";
import { LeadershipQuestionsSection } from "../leadershipQuestionsSection";
import { ConditionQuestionsSection, WorkSituationsSection } from "../workQuestionsSections";
import { getRoleResources } from "../../../lib/report/roleResources";

type Params = { role: string };

export const dynamicParams = true;
export const revalidate = 3600;

/* The role first, as on the company pages: a result list cuts a long title from the end. */
const titleFor = (title: string) => `${title}: what to ask for this week`;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const role = findRole((await params).role);
  if (!role) return {};
  const { stale } = await loadWeekConditions();
  const metadata = buildPageMetadata({
    title: titleFor(role.title),
    description: `Is now a good time for ${role.label} to ask for a raise, more headcount or a slower roadmap? What this week's conditions mean at any tech company, the general rules, and questions to ask leadership.`,
    path: `/roles/${role.slug}`,
    imageAlt: titleFor(role.title),
  });
  if (stale) metadata.robots = { index: false, follow: true };
  return metadata;
}

export default async function RolePage({ params }: { params: Promise<Params> }) {
  const role = findRole((await params).role);
  if (!role) notFound();

  const { conditions, regime, rules } = await loadWeekConditions();
  const path = `/roles/${role.slug}` as const;
  const roleQuestion = conditionQuestionForRole(role.slug, regime);
  const { leadershipGuidance, toolkits } = getRoleResources(role.slug);
  return (
    <ContentPageShell data-content-measurement-root={path}>
      <ContentMeasurementTracker pagePath={path} cluster="authority" intent="vp-product" />
      <JsonLdScript data={buildRolePageStructuredData({ path, title: titleFor(role.title), role: role.title, trail: [{ name: role.title, path }], dateModifiedIso: conditions.recordDateIso })} />
      <Breadcrumbs
        items={toVisibleBreadcrumbs(
          buildGroupBreadcrumbs(toRoute(path), [
            { name: role.title, path: toRoute(path) },
          ]),
        )}
      />
      <section className="weather-panel space-y-2 px-6 max-sm:px-0 py-6">
        <h1 className="text-fluid-2xl font-semibold text-slate-100">What {role.label} can ask for this week</h1>
        <p className="text-sm text-slate-300">
          Is now a good time to ask for a raise, more headcount, or a slower roadmap? Here is what this week's conditions say for {role.label}, and what to ask leadership. It works for any tech company, public or private.
        </p>
      </section>
      <ConditionsSection conditions={conditions} />
      <RoleDecisionsSection
        role={role}
        askFor={askForThisWeek(role, regime)}
        paybackBar={paybackBarLine(regime)}
        rules={role.areas.flatMap((area) => rules.filter((rule) => rule.area === area))}
      />
      <ConditionQuestionsSection regime={regime} questions={roleQuestion ? [roleQuestion] : []} pagePath={path} />
      <WorkSituationsSection situations={workSituationsForRole(role.slug)} pagePath={path} />
      <LeadershipQuestionsSection role={role} pagePath={path} />
      <section className="weather-panel space-y-4 px-6 max-sm:px-0 py-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Leadership guidance and worksheets</h2>
          <p className="text-sm text-slate-300">
            Guidance for leadership discussions and one-decision worksheets that apply to {role.label}.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {leadershipGuidance ? (
            <div className="space-y-2">
              <h3 className="type-eyebrow text-slate-300">Leadership guidance</h3>
              <p className="text-xs text-slate-400">
                {leadershipGuidance.tagline}
              </p>
              <ActionLink href={`/resources?stakeholder=${leadershipGuidance.stakeholderSlug}`} variant="pill">
                {leadershipGuidance.stakeholderTitle} &rarr;
              </ActionLink>
            </div>
          ) : null}
          {toolkits.length > 0 ? (
            <div className="space-y-2">
              <h3 className="type-eyebrow text-slate-300">Applicable worksheets</h3>
              <p className="text-xs text-slate-400">
                Worksheets for decisions {role.label} face under current conditions:
              </p>
              <div className="flex flex-wrap gap-2">
                {toolkits.map((toolkit) => (
                  <ActionLink key={toolkit.slug} href={`/toolkits/${toolkit.slug}`} variant="pill">
                    {toolkit.title.replace(/ Toolkit$/, "")}
                  </ActionLink>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Where to go next</h2>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <ActionLink href="/" variant="pill">This week&apos;s full brief</ActionLink>
          {ROLE_STAGES.map((stage) => (
            <ActionLink key={stage} href={`/roles/${role.slug}/${stage}`} variant="pill">
              At {stageForWorkers(stage).atCompanies}
            </ActionLink>
          ))}
          <ActionLink href="/companies" variant="pill">Public company figures</ActionLink>
          {ROLES.filter((other) => other.slug !== role.slug).map((other) => (
            <ActionLink key={other.slug} href={`/roles/${other.slug}`} variant="pill">{other.title}</ActionLink>
          ))}
        </div>
      </section>
    </ContentPageShell>
  );
}
