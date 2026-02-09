import Link from "next/link";

type RelatedReportLink = {
  href: string;
  label: string;
  description: string;
};

export const RelatedReportLinks = ({
  title = "Related pages",
  links,
}: {
  title?: string;
  links: RelatedReportLink[];
}) => {
  return (
    <section className="weather-panel space-y-3 px-6 py-5" aria-label={title}>
      <p className="text-xs font-semibold tracking-[0.22em] text-slate-400">Explore next</p>
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      <div className="grid gap-3 md:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="weather-surface space-y-2 p-4 transition-colors hover:border-sky-400/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
          >
            <p className="text-sm font-semibold text-slate-100">{link.label}</p>
            <p className="text-sm text-slate-300">{link.description}</p>
            <p className="text-xs font-semibold tracking-[0.14em] text-sky-200">Open page →</p>
          </Link>
        ))}
      </div>
    </section>
  );
};
