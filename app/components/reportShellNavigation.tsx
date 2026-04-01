import { getCompactSectionLabel } from "../../lib/report/homeSections";

export type ReportSectionLink = {
  href: string;
  label: string;
};

const resolveCompactSectionLabel = (sectionLink: ReportSectionLink) =>
  getCompactSectionLabel(sectionLink.href, sectionLink.label);

export const ReportSectionNavigation = ({
  sectionLinks,
  className,
  maxItems,
}: {
  sectionLinks: ReportSectionLink[];
  className?: string;
  maxItems?: number;
}) => {
  if (!sectionLinks.length) {
    return null;
  }
  const visibleSectionLinks = sectionLinks.slice(0, Math.max(1, maxItems ?? sectionLinks.length));
  const hiddenSectionCount = Math.max(sectionLinks.length - visibleSectionLinks.length, 0);

  return (
    <nav aria-label="Section index" className={className}>
      <ol className="space-y-2 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-3">
        {visibleSectionLinks.map((section, index) => (
          <li key={section.href}>
            <a
              href={section.href}
              className="inline-flex min-h-[42px] w-full items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/50 px-3 py-2 text-left text-xs font-semibold tracking-[0.12em] text-slate-300 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            >
              <span>{resolveCompactSectionLabel(section)}</span>
              <span className="text-[10px] text-slate-400">{index + 1}</span>
            </a>
          </li>
        ))}
      </ol>
      {hiddenSectionCount > 0 ? (
        <p className="px-3 pb-3 pt-2 text-[11px] text-slate-400">
          {hiddenSectionCount} more section{hiddenSectionCount === 1 ? "" : "s"} below.
        </p>
      ) : null}
    </nav>
  );
};
