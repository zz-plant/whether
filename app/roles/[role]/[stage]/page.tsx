import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildGroupBreadcrumbs, toVisibleBreadcrumbs } from "../../../../lib/navigation/breadcrumbs";
import { toRoute } from "../../../../lib/navigation/routeType";
import { buildScopedVariantDecisionAdjustment } from "../../../../lib/report/boundedDecisionRules";
import { askForThisWeek, findRole, paybackBarLine, ROLES } from "../../../../lib/report/companyRoles";
import { findRoleStage, ROLE_STAGES, stageForWorkers } from "../../../../lib/report/roleStages";
import { buildPageMetadata } from "../../../../lib/seo";
import { buildRolePageStructuredData } from "../../../../lib/seo/pageStructuredData";
import { ConditionsSection, RoleDecisionsSection } from "../../../companies/companyPageSections";
import { loadWeekConditions } from "../../../companies/loadCompanyPage";
import { ContentMeasurementTracker } from "../../../components/contentMeasurementTracker";
import { JsonLdScript } from "../../../components/jsonLdScript";
import { ActionLink } from "../../../components/ui/actionLink";
import { Breadcrumbs } from "../../../components/ui/breadcrumbs";
import { ContentPageShell } from "../../../components/ui/contentPageShell";
import { LeadershipQuestionsSection } from "../../leadershipQuestionsSection";
import { RoleStageSection } from "../../roleStageSection";

type Params = { role: string; stage: string };

export const dynamicParams = true;
export const revalidate = 3600;

const titleFor = (label: string, atCompanies: string) => `This week's conditions for ${label} at ${atCompanies}`;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { role: roleSlug, stage: stageSlug } = await params;
  const role = findRole(roleSlug);
  const stage = findRoleStage(stageSlug);
  if (!role || !stage) return {};
  const { stale } = await loadWeekConditions();
  const { atCompanies } = stageForWorkers(stage);
  const metadata = buildPageMetadata({
    title: titleFor(role.label, atCompanies),
    description: `What this week's conditions mean for ${role.label} at ${atCompanies}: what to ask for, the rule at this stage, and questions to ask leadership.`,
    path: `/roles/${role.slug}/${stage}`,
    imageAlt: titleFor(role.label, atCompanies),
  });
  if (stale) metadata.robots = { index: false, follow: true };
  return metadata;
}

export default async function RoleStagePage({ params }: { params: Promise<Params> }) {
  const { role: roleSlug, stage: stageSlug } = await params;
  const role = findRole(roleSlug);
  const stage = findRoleStage(stageSlug);
  if (!role || !stage) notFound();

  const { conditions, regime, thresholds, scores } = await loadWeekConditions();
  const { atCompanies } = stageForWorkers(stage);
  const title = titleFor(role.label, atCompanies);
  const rolePath = `/roles/${role.slug}` as const;
  const path = `/roles/${role.slug}/${stage}` as const;
  const stageName = `${atCompanies.charAt(0).toUpperCase()}${atCompanies.slice(1)}`;
  return (
    <ContentPageShell data-content-measurement-root={path}>
      <ContentMeasurementTracker pagePath={path} cluster="authority" intent="vp-product" />
      <JsonLdScript
        data={buildRolePageStructuredData({
          path,
          title,
          role: role.title,
          trail: [
            { name: role.title, path: rolePath },
            { name: stageName, path },
          ],
        })}
      />
      <Breadcrumbs
        items={toVisibleBreadcrumbs(
          buildGroupBreadcrumbs(toRoute(path), [
            { name: "Roles", path: toRoute("/roles") },
            { name: role.title, path: toRoute(rolePath) },
            { name: stageName, path: toRoute(path) },
          ]),
        )}
      />
      <section className="weather-panel space-y-2 px-6 max-sm:px-0 py-6">
        <h1 className="text-fluid-2xl font-semibold text-slate-100">This week&apos;s conditions for {role.label} at {atCompanies}</h1>
        <p className="text-sm text-slate-300">
          What changes for {role.label} at this stage, beside this week&apos;s conditions.
        </p>
      </section>
      <ConditionsSection conditions={conditions} />
      <RoleStageSection
        atCompanies={atCompanies}
        askFor={role.atStage[stage]}
        adjustment={buildScopedVariantDecisionAdjustment({ mode: stage, thresholds, scores })}
      />
      <RoleDecisionsSection
        role={role}
        askFor={askForThisWeek(role, regime)}
        paybackBar={paybackBarLine(regime)}
        /* The role's own page prints the area rules and the runway answers, once. */
        rules={[]}
      />
      <LeadershipQuestionsSection role={role} stage={stage} pagePath={path} answersHref={`${rolePath}#runway-answers`} />
      <section className="weather-panel space-y-3 px-6 max-sm:px-0 py-6">
        <h2 className="text-lg font-semibold text-slate-100">Where to go next</h2>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <ActionLink href="/" variant="pill">This week&apos;s full brief</ActionLink>
          <ActionLink href={rolePath} variant="pill">{role.title} at any company</ActionLink>
          {ROLE_STAGES.filter((other) => other !== stage).map((other) => (
            <ActionLink key={other} href={`/roles/${role.slug}/${other}`} variant="pill">
              At {stageForWorkers(other).atCompanies}
            </ActionLink>
          ))}
          {ROLES.filter((other) => other.slug !== role.slug).map((other) => (
            <ActionLink key={other.slug} href={`/roles/${other.slug}/${stage}`} variant="pill">{other.title}</ActionLink>
          ))}
        </div>
      </section>
    </ContentPageShell>
  );
}
