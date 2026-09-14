"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReportSectionLink } from "./reportShellNavigation";
import { loopNavigationLayers } from "../../lib/navigation/informationArchitecture";
import {
  resolveActiveSectionId,
  sectionIdsFromHrefs,
} from "../../lib/navigation/sectionOutline";

function OutlineItem({
  href,
  label,
  isActive,
  stepNumber,
  shortcut,
}: {
  href: string;
  label: string;
  isActive: boolean;
  stepNumber?: string;
  shortcut?: string;
}) {
  const isHash = href.startsWith("#");
  const linkClass = `rounded-lg px-2.5 py-1.5 text-fluid-xs no-underline transition-colors min-h-[38px] flex items-center justify-between group weather-focus-ring ${
    isActive
      ? "bg-sky-500/15 text-white font-semibold border-l-2 border-sky-400 pl-2"
      : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 border-l-2 border-transparent pl-2"
  }`;

  const content = (
    <>
      <span className="flex items-center gap-2 truncate">
        {stepNumber ? (
          <span
            className={`font-mono text-[10px] tabular-nums ${
              isActive ? "font-bold text-sky-300" : "text-slate-500"
            }`}
          >
            {stepNumber}
          </span>
        ) : null}
        <span className="truncate">{label}</span>
      </span>
      {shortcut ? (
        <kbd
          aria-hidden="true"
          className="rounded border border-slate-800 bg-slate-900/80 px-1 font-mono text-[9.5px] leading-3 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {shortcut}
        </kbd>
      ) : null}
    </>
  );

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

function SidebarContent({ sectionLinks }: { sectionLinks: ReportSectionLink[] }) {
  const currentPathname = usePathname() ?? "/";
  const [pathname, setPathname] = useState("/");
  const activeSectionId = useActiveSectionId(sectionLinks);

  useEffect(() => {
    setPathname(currentPathname);
  }, [currentPathname]);

  return (
    <>
      <Link
        href="/"
        className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2 no-underline hover:bg-slate-800/30"
      >
        <span className="text-lg font-semibold tracking-tight text-slate-100">
          Whether
        </span>
      </Link>

      {sectionLinks.length > 0 ? (
        <>
          <p className="px-3 type-eyebrow mb-2">
            On this page
          </p>
          <nav aria-label="Page sections" className="space-y-0.5">
            {sectionLinks.map((section, index) => {
              const isActive = section.href === `#${activeSectionId}`;
              return (
                <OutlineItem
                  key={section.href}
                  href={section.href}
                  label={section.label}
                  isActive={isActive}
                  stepNumber={`0${index + 1}`}
                />
              );
            })}
          </nav>
        </>
      ) : null}

      <div className="my-4 border-t border-slate-800/60" />

      <p className="px-3 type-eyebrow mb-2">
        Workflow
      </p>
      <nav aria-label="Workflow" className="space-y-0.5">
        {loopNavigationLayers.map((route, index) => {
          const isActive =
            route.href === "/"
              ? pathname === "/"
              : pathname.startsWith(route.href);
          return (
            <OutlineItem
              key={route.href}
              href={route.href}
              label={route.navLabel ?? route.label}
              isActive={isActive}
              stepNumber={`0${index + 1}`}
              shortcut={route.shortcut}
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
