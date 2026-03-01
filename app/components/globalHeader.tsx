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

  const currentPageLabel =
    breadcrumbs[breadcrumbs.length - 1]?.label ?? "Weekly briefing";

  const navLinks = primaryNavigation.filter((link) => link.staticHub !== false);

  return (
    <header className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
      <div className="weather-appbar px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/"
              className="inline-flex min-h-[44px] items-center rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-200 hover:border-sky-400/70 hover:text-sky-100"
            >
              Whether
            </Link>
            <p className="mt-1 truncate text-base font-semibold tracking-tight text-slate-100 sm:text-lg">
              {currentPageLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="weather-button inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
            aria-label="Toggle light mode"
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>

        <div className="mt-3">
          <Link
            href="/operations/plan"
            className="weather-button-primary inline-flex min-h-[44px] w-full items-center justify-center px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
          >
            Run weekly sequence
          </Link>
        </div>

        <nav
          aria-label="Global navigation"
          className="mt-3 -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1"
        >
          {navLinks.map((link) => {
            const isActive = pathMatchesLink(link.href, pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`weather-pill inline-flex min-h-[44px] shrink-0 items-center px-4 py-2 text-sm font-semibold tracking-[0.06em] ${
                  isActive
                    ? "border-sky-300/85 bg-sky-400/20 text-sky-100"
                    : "text-slate-100 hover:border-sky-400/70"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 hidden items-center justify-between border-t border-slate-800/70 pt-3 sm:flex">
          <p className="text-xs tracking-[0.12em] text-slate-400">
            {breadcrumbs.length > 1 ? (
              <>
                <Link href="/" className="hover:text-sky-200">
                  Home
                </Link>
                <span className="px-1.5 text-slate-500">→</span>
                <span aria-current="page">{currentPageLabel}</span>
              </>
            ) : (
              <span>Weekly briefing</span>
            )}
          </p>
          <Link
            href="/briefing"
            className="weather-button inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
          >
            Leadership brief
          </Link>
        </div>
      </div>
    </header>
  );
}
