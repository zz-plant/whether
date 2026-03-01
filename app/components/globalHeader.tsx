"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { primaryNavigation } from "../../lib/navigation/primaryNavigation";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";

const toTitleCase = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const segmentLabelMap: Record<string, string> = {
  start: "Command Center",
  decide: "Decide",
  toolkits: "Toolkits",
  learn: "Learn",
  method: "Method",
  posture: "Posture",
  onboarding: "Onboarding",
  library: "Library",
  "failure-modes": "Failure modes",
};

export function GlobalHeader() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("whether-theme");
    const nextTheme = savedTheme === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("whether-theme", nextTheme);
  };

  const breadcrumbs = useMemo(() => {
    if (!pathname || pathname === "/") {
      return [{ href: "/", label: "Weekly briefing" }];
    }

    const segments = pathname.split("/").filter(Boolean);
    const crumbs = [{ href: "/", label: "Home" }];

    let href = "";
    for (const segment of segments) {
      href += `/${segment}`;
      crumbs.push({
        href,
        label: segmentLabelMap[segment] ?? toTitleCase(segment),
      });
    }

    return crumbs;
  }, [pathname]);

  return (
    <header className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
      <div className="weather-appbar px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Global navigation" className="flex flex-wrap items-center gap-2">
            {primaryNavigation.filter((link) => link.staticHub !== false).map((link) => {
              const isActive = pathMatchesLink(link.href, pathname);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.08em] transition-colors ${
                    isActive
                      ? "border-sky-400/70 bg-sky-500/20 text-sky-100"
                      : "text-slate-100 hover:border-sky-400/70"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <button type="button" onClick={toggleTheme} className="weather-button text-sm" aria-label="Toggle light mode">
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>

        <nav aria-label="Breadcrumb" className="mt-4 overflow-x-auto">
          <ol className="flex min-h-[44px] items-center gap-2 whitespace-nowrap text-sm text-slate-200">
            {breadcrumbs.map((crumb, index) => {
              const isCurrent = index === breadcrumbs.length - 1;
              return (
                <li key={crumb.href} className="inline-flex items-center gap-2">
                  {index > 0 ? <span aria-hidden="true" className="text-slate-500">/</span> : null}
                  {isCurrent ? (
                    <span aria-current="page" className="font-semibold text-slate-100">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} className="text-slate-300 hover:text-sky-200">
                      {crumb.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-700/70 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">Primary actions</p>
          <Link
            href="/operations/plan"
            className="weather-button-primary inline-flex min-h-[44px] items-center justify-center"
          >
            Run weekly operating sequence
          </Link>
          <Link
            href="/briefing"
            className="weather-button inline-flex min-h-[44px] items-center justify-center"
          >
            Generate leadership brief
          </Link>
        </div>
      </div>
    </header>
  );
}
