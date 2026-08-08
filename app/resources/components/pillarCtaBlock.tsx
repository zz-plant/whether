import { ActionLink } from "../../components/ui/actionLink";

type PillarCtaBlockProps = {
  title: string;
  body: string;
  keyword: string;
  sourceSlug: string;
  downloadLabel: string;
};

export function PillarCtaBlock({ title, body, keyword, sourceSlug, downloadLabel }: PillarCtaBlockProps) {
  return (
    <section className="weather-panel space-y-3 border border-emerald-400/45 bg-emerald-500/10 px-6 py-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">Board CTA</p>
      <h3 className="text-xl font-semibold text-slate-100">{title}</h3>
      <p className="text-sm text-slate-200">{body}</p>
      <div className="flex flex-wrap gap-3">
        <ActionLink
          href="/planning"
          variant="pill"
          className="text-sm"
          data-conversion-event="demo/contact"
          data-conversion-surface="pillar-cta"
          data-conversion-keyword={keyword}
        >
          Open Planning
        </ActionLink>
        <ActionLink
          href={`/resources/capital-posture-template?source=${encodeURIComponent(sourceSlug)}`}
          variant="ghost"
          className="text-sm"
          data-conversion-event="download"
          data-conversion-surface="pillar-cta"
          data-conversion-keyword={keyword}
        >
          {downloadLabel}
        </ActionLink>
        <ActionLink
          href="/planning#ops-export-briefs"
          variant="pill"
          className="text-sm"
          data-conversion-event="request"
          data-conversion-surface="pillar-cta"
          data-conversion-keyword={keyword}
        >
          Open board-pack brief
        </ActionLink>
      </div>
    </section>
  );
}
