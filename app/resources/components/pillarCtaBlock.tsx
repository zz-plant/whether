import Link from "next/link";

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
        <Link
          href={`/start?intent=${encodeURIComponent("demo-contact")}&source=${encodeURIComponent(sourceSlug)}`}
          className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-sm font-semibold text-slate-100"
          data-conversion-event="demo/contact"
          data-conversion-surface="pillar-cta"
          data-conversion-keyword={keyword}
        >
          Book Demo / Contact
        </Link>
        <Link
          href={`/resources/capital-posture-template?source=${encodeURIComponent(sourceSlug)}`}
          className="weather-button inline-flex items-center justify-center"
          data-conversion-event="download"
          data-conversion-surface="pillar-cta"
          data-conversion-keyword={keyword}
        >
          {downloadLabel}
        </Link>
        <Link
          href={`/start?intent=${encodeURIComponent("board-pack-request")}&source=${encodeURIComponent(sourceSlug)}`}
          className="weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-sm font-semibold text-slate-100"
          data-conversion-event="request"
          data-conversion-surface="pillar-cta"
          data-conversion-keyword={keyword}
        >
          Request Board Pack
        </Link>
      </div>
    </section>
  );
}
