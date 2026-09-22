"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ReportSectionLink } from "./reportShellNavigation";
import {
  resolveActiveSectionId,
  sectionIdsFromHrefs,
} from "../../lib/navigation/sectionOutline";

function OutlineItem({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  const isHash = href.startsWith("#");
  const linkClass = `rounded-lg px-2.5 py-1.5 text-fluid-xs no-underline transition-colors min-h-[38px] flex items-center justify-between group weather-focus-ring ${
    isActive
      ? "bg-sky-500/15 text-white font-semibold border-l-2 border-sky-400 pl-2"
      : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-l-2 border-transparent pl-2"
  }`;

  const content = <span className="truncate">{label}</span>;

  if (isHash) {
    return (
      <a href={href} className={linkClass} aria-current={isActive ? "location" : undefined}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={linkClass} aria-current={isActive ? "page" : undefined}>
      {content}
    </Link>
  );
}

/**
 * Which section the reader is actually in.
 *
 * The outline used to mark a section active with `pathname.includes(section.href)`,
 * where the href is a fragment like "#current-scores" and the pathname never
 * carries a fragment — so the branch was unreachable and the table of contents
 * on a 4,000px page never said where you were.
 *
 * The band is the top slice of the viewport: a section counts as current once its
 * heading reaches the header and until the next one does. When nothing is in the
 * band — mid-scroll between two sections, or at the very bottom — the last answer
 * stands rather than blanking.
 */
export const useActiveSectionId = (sectionLinks: ReportSectionLink[]) => {
  const sectionIds = useMemo(
    () => sectionIdsFromHrefs(sectionLinks.map((section) => section.href)),
    [sectionLinks],
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!sectionIds.length || typeof IntersectionObserver === "undefined") {
      return;
    }

    const nodes = sectionIds
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (!nodes.length) {
      return;
    }

    const onScreen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onScreen.add(entry.target.id);
          } else {
            onScreen.delete(entry.target.id);
          }
        }
        setActiveId((previous) => resolveActiveSectionId(sectionIds, onScreen, previous));
      },
      { rootMargin: "-96px 0px -72% 0px", threshold: 0 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
};

/**
 * The page outline, and only that. The rail used to open with a second
 * `Whether` wordmark 80px under the header's, and close with a `Workflow`
 * group listing the six loop routes the header tabs list 100px above it —
 * numbered and with the same hover shortcuts. Both named things the header
 * already named on the same screen (ui-ux-standards §XI: state gets stated
 * once), so the rail keeps the one job the header cannot do: say where on this
 * page the reader is.
 */
function SidebarContent({ sectionLinks }: { sectionLinks: ReportSectionLink[] }) {
  const activeSectionId = useActiveSectionId(sectionLinks);

  if (sectionLinks.length === 0) return null;

  return (
    <>
      <p className="px-3 type-eyebrow mb-2">
        On this page
      </p>
      <nav aria-label="Page sections" className="space-y-0.5">
        {sectionLinks.map((section) => {
          const isActive = section.href === `#${activeSectionId}`;
          return (
            <OutlineItem
              key={section.href}
              href={section.href}
              label={section.label}
              isActive={isActive}
            />
          );
        })}
      </nav>
    </>
  );
}

type AppSidebarProps = {
  sectionLinks?: ReportSectionLink[];
};

export function AppSidebar({ sectionLinks = [] }: AppSidebarProps) {
  return (
    <aside className="hidden lg:flex lg:h-full lg:flex-col">
      <SidebarContent sectionLinks={sectionLinks} />
    </aside>
  );
}
