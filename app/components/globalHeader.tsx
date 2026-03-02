"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { primaryNavigation } from "../../lib/navigation/primaryNavigation";
import { pathMatchesLink } from "../../lib/navigation/pathMatching";
import {
  ROLE_LENS_PARAM_KEY,
  ROLE_LENS_STORAGE_KEY,
  type RoleLensKey,
  roleLensOptions,
} from "../../lib/report/roleLens";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const activeRoleLens = useMemo<RoleLensKey>(() => {
    const lens = searchParams.get(ROLE_LENS_PARAM_KEY);
    if (lens && roleLensOptions.some((option) => option.key === lens)) {
      return lens as RoleLensKey;
    }
    return "pm";
  }, [searchParams]);

  const withRoleLens = (href: string, lens: RoleLensKey) => {
    if (!href.startsWith("/")) {
      return href;
    }

    const [path, hash] = href.split("#");
    const [basePath, queryString] = path.split("?");
    const params = new URLSearchParams(queryString ?? "");
    params.set(ROLE_LENS_PARAM_KEY, lens);
    const nextHref = `${basePath}?${params.toString()}`;
    return hash ? `${nextHref}#${hash}` : nextHref;
  };

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("whether-theme");
    const nextTheme = savedTheme === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  useEffect(() => {
    const lensParam = searchParams.get(ROLE_LENS_PARAM_KEY);
    const savedLens = window.localStorage.getItem(ROLE_LENS_STORAGE_KEY);

    if (lensParam && roleLensOptions.some((option) => option.key === lensParam)) {
      window.localStorage.setItem(ROLE_LENS_STORAGE_KEY, lensParam);
      return;
    }

    const fallbackLens =
      savedLens && roleLensOptions.some((option) => option.key === savedLens)
        ? (savedLens as RoleLensKey)
        : "pm";

    const params = new URLSearchParams(searchParams.toString());
    params.set(ROLE_LENS_PARAM_KEY, fallbackLens);
    router.replace(`${pathname}?${params.toString()}` as Route, { scroll: false });
  }, [pathname, router, searchParams]);

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
              href={withRoleLens("/", activeRoleLens) as Route}
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

        <nav
          aria-label="Global navigation"
          className="mt-3 -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1"
        >
          {navLinks.map((link) => {
            const isActive = pathMatchesLink(link.href, pathname);
            return (
              <Link
                key={link.href}
                href={withRoleLens(link.href, activeRoleLens) as Route}
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

        <div className="mt-3 border-t border-slate-800/70 pt-3">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Role lens</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {roleLensOptions.map((option) => {
              const isActive = option.key === activeRoleLens;
              return (
                <Link
                  key={option.key}
                  href={(() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set(ROLE_LENS_PARAM_KEY, option.key);
                    const nextQuery = params.toString();
                    return `${pathname ?? "/"}?${nextQuery}` as Route;
                  })()}
                  onClick={() => {
                    window.localStorage.setItem(ROLE_LENS_STORAGE_KEY, option.key);
                  }}
                  aria-current={isActive ? "true" : undefined}
                  className={`weather-pill inline-flex min-h-[44px] items-center px-4 py-2 text-sm font-semibold tracking-[0.05em] ${
                    isActive
                      ? "border-sky-300/85 bg-sky-400/20 text-sky-100"
                      : "text-slate-100 hover:border-sky-400/70"
                  }`}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-3 hidden border-t border-slate-800/70 pt-3 sm:block">
          <p className="text-xs tracking-[0.12em] text-slate-400">
            {breadcrumbs.length > 1 ? (
              <>
                <Link href={withRoleLens("/", activeRoleLens) as Route} className="hover:text-sky-200">
                  Home
                </Link>
                <span className="px-1.5 text-slate-500">→</span>
                <span aria-current="page">{currentPageLabel}</span>
              </>
            ) : (
              <span>Weekly briefing</span>
            )}
          </p>
        </div>
      </div>
    </header>
  );
}
