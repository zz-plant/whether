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
      <div className="weather-panel-static space-y-3 rounded px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="type-eyebrow">
            On this page
          </p>
          <span className="weather-tag weather-tag-slate">
            {sectionLinks.length} step{sectionLinks.length === 1 ? "" : "s"}
          </span>
        </div>
        <ol className="space-y-2">
        {visibleSectionLinks.map((section, index) => (
          <li key={section.href}>
            <a
              href={section.href}
              className="weather-pill inline-flex min-h-[44px] w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold tracking-[0.12em] text-slate-300 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            >
              <span>{resolveCompactSectionLabel(section)}</span>
              <span className="text-fluid-micro text-slate-400">{index + 1}</span>
            </a>
          </li>
        ))}
        </ol>
        {hiddenSectionCount > 0 ? (
          <p className="px-1 text-fluid-xs text-slate-400">
            {hiddenSectionCount} more section{hiddenSectionCount === 1 ? "" : "s"} below.
          </p>
        ) : null}
      </div>
    </nav>
  );
};
