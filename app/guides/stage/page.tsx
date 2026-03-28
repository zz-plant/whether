import type { Metadata } from "next";
import { buildPageMetadata } from "../../../lib/seo";
import { stageGuides } from "../stageGuides";
import { SecondaryPageHeader, SecondaryPageSection, SecondaryPageShell } from "../../components/secondaryPageShell";
import { ButtonLink } from "../../components/ui/buttonLink";
import { ActionLink } from "../../components/ui/actionLink";

export const metadata: Metadata = buildPageMetadata({
  title: "Company Stage Guidance — Whether",
  description:
    "See how Whether helps Seed through Series C leadership teams set posture, reduce planning entropy, and improve board-grade communication.",
  path: "/guides/stage",
  imageAlt: "Whether company stage guidance",
  imagePath: "/social/guides.svg",
});

export default function StageLandingPage() {
  return (
    <SecondaryPageShell>
      <SecondaryPageHeader
        eyebrow="Company stage map"
        title="Who gets the most leverage from Whether at each company stage?"
        description="The ROI grows with coordination cost, capital dependence, and board pressure. At early stages, the gain is mostly narrative clarity. At later stages, posture becomes operating governance."
      />

      <SecondaryPageSection title="Stage summary table">
        <div className="overflow-x-auto weather-surface px-4 py-4">
          <table className="w-full min-w-[620px] text-left text-sm text-slate-200">
            <thead>
              <tr className="border-b border-slate-700 text-xs uppercase tracking-[0.12em] text-slate-400">
                <th className="py-2 pr-4">Stage</th>
                <th className="py-2 pr-4">Team size</th>
                <th className="py-2 pr-4">Primary value</th>
                <th className="py-2 pr-4">Operational leverage</th>
                <th className="py-2">Narrative leverage</th>
              </tr>
            </thead>
            <tbody>
              {stageGuides.map((stage) => (
                <tr key={stage.slug} className="border-b border-slate-800/80 align-top">
                  <td className="py-3 pr-4 font-semibold text-slate-100">{stage.title}</td>
                  <td className="py-3 pr-4">{stage.teamSize}</td>
                  <td className="py-3 pr-4">{stage.primaryValue}</td>
                  <td className="py-3 pr-4">{stage.operationalLeverage}</td>
                  <td className="py-3">{stage.narrativeLeverage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SecondaryPageSection>

      <section className="grid gap-4 xl:grid-cols-2">
        {stageGuides.map((stage) => (
          <article key={stage.slug} className="weather-panel space-y-3 px-6 py-6">
            <h2 className="text-xl font-semibold text-slate-100">{stage.title}</h2>
            <p className="text-sm text-slate-200">{stage.summary}</p>
            <p className="text-sm text-slate-300">
              <span className="font-semibold text-slate-100">Best use:</span> {stage.bestUse}
            </p>
            <ActionLink href={`/guides/stage/${stage.slug}`} variant="inline">
              Open {stage.title} page
            </ActionLink>
          </article>
        ))}
      </section>

      <SecondaryPageSection
        eyebrow="Open the live app"
        actions={(
          <>
            <ButtonLink href="/" variant="primary">Weekly Brief</ButtonLink>
            <ButtonLink href="/operations" variant="pill">Planning</ButtonLink>
          </>
        )}
      />
    </SecondaryPageShell>
  );
}
