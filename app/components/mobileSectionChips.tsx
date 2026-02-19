"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReportSectionLink } from "./reportShellNavigation";

const toDecisionLabel = (label: string) => {
  const normalized = label.toLowerCase();
  if (normalized.includes("weekly") || normalized.includes("action")) {
    return "Act now";
  }
  if (normalized.includes("executive") || normalized.includes("leadership")) {
    return "Leadership";
  }
  if (normalized.includes("change") || normalized.includes("delta")) {
    return "Delta";
  }
  if (normalized.includes("alert")) {
    return "Alerts";
  }
  if (normalized.includes("signal") || normalized.includes("matrix")) {
    return "Signal risks";
  }
  return label;
};

const linkToHash = (href: string) => {
  if (!href.startsWith("#")) {
    return "";
  }

  return href;
};

export const MobileSectionChips = ({
  links,
}: {
  links: ReportSectionLink[];
}) => {
  const [activeHash, setActiveHash] = useState<string>("");

  useEffect(() => {
    const updateHash = () => {
      setActiveHash(window.location.hash || "");
    };

    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  useEffect(() => {
    const observedSections = links
      .map((link) => linkToHash(link.href))
      .filter(Boolean)
      .map((hash) => document.getElementById(hash.slice(1)))
      .filter((section): section is HTMLElement => Boolean(section));

    if (observedSections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (inView.length === 0) {
          return;
        }

        const candidate = inView[0].target.id;
        if (candidate) {
          setActiveHash(`#${candidate}`);
        }
      },
      {
        rootMargin: "-20% 0px -65% 0px",
        threshold: [0.1, 0.4, 0.7],
      },
    );

    observedSections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [links]);

  const activeIndex = useMemo(() => {
    if (links.length === 0) {
      return -1;
    }
    const selectedIndex = links.findIndex((item) => item.href === activeHash);
    return selectedIndex >= 0 ? selectedIndex : 0;
  }, [activeHash, links]);

  if (links.length === 0) {
    return null;
  }

  const activeLabel = activeIndex >= 0 ? toDecisionLabel(links[activeIndex].label) : "Overview";

  return (
    <nav aria-label="Quick section jumps" className="overflow-hidden sm:hidden">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-[0.16em] text-slate-400">Jump to section</p>
        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-400" aria-live="polite" aria-atomic="true">
          {activeIndex + 1}/{links.length} · {activeLabel}
        </p>
      </div>
      <ul className="flex w-full max-w-full gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {links.map((link) => {
          const isActive = activeHash === link.href || (activeHash === "" && link.href === links[0]?.href);
          return (
            <li key={link.href} className="flex-shrink-0">
              <a
                href={link.href}
                aria-current={isActive ? "location" : undefined}
                onClick={() => setActiveHash(link.href)}
                className={`weather-pill inline-flex min-h-[44px] items-center rounded-full px-3 py-2 text-xs font-semibold tracking-[0.12em] touch-manipulation ${
                  isActive
                    ? "border-sky-300/80 bg-sky-500/15 text-sky-100"
                    : "text-slate-200 hover:border-sky-400/70 hover:text-slate-100"
                }`}
              >
                {toDecisionLabel(link.label)}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
