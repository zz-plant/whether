"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type OperatorCommandAction = {
  href: string;
  label: string;
  description: string;
  group: "Playbook" | "Pages" | "Sections";
  keywords?: string[];
};

type CommandFilter = "All" | OperatorCommandAction["group"];

const STORAGE_KEY = "whether-command-center-query";
const filterOrder: CommandFilter[] = ["All", "Playbook", "Pages", "Sections"];

const filterHelper: Record<CommandFilter, string> = {
  All: "All results across actions, pages, and sections.",
  Playbook: "Do now: immediate actions and operator moves.",
  Pages: "Switch surfaces: navigate to another report page.",
  Sections: "Jump within this page to a specific section.",
};

const groupGlyph: Record<OperatorCommandAction["group"], string> = {
  Playbook: "⚡",
  Pages: "◉",
  Sections: "↳",
};

const normalize = (value: string) => value.toLowerCase().trim();

const isInPageLink = (href: string) => href.startsWith("#") || href.includes("/#");

const isTextInputTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
};

export const OperatorCommandCenter = ({ actions }: { actions: OperatorCommandAction[] }) => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CommandFilter>("All");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const initialQuery = sessionStorage.getItem(STORAGE_KEY);
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, query);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (isTextInputTarget(event.target)) {
          return;
        }

        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if (event.key === "Escape" && document.activeElement === searchInputRef.current) {
        setQuery("");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const groupedActions = useMemo(() => {
    const normalizedQuery = normalize(query);
    const filtered = actions.filter((action) => {
      const target = `${action.label} ${action.description} ${action.group} ${(action.keywords ?? []).join(" ")}`.toLowerCase();
      const queryMatches = normalizedQuery.length === 0 || target.includes(normalizedQuery);
      const filterMatches = filter === "All" || action.group === filter;

      return queryMatches && filterMatches;
    });

    return filtered.slice(0, 12).reduce<Record<OperatorCommandAction["group"], OperatorCommandAction[]>>(
      (accumulator, action) => {
        accumulator[action.group].push(action);
        return accumulator;
      },
      {
        Playbook: [],
        Pages: [],
        Sections: [],
      },
    );
  }, [actions, filter, query]);

  const totalResults =
    groupedActions.Playbook.length + groupedActions.Pages.length + groupedActions.Sections.length;
  const topMatch = groupedActions.Playbook[0] ?? groupedActions.Pages[0] ?? groupedActions.Sections[0];

  return (
    <section className="weather-panel relative z-10 space-y-4 px-4 py-4 sm:px-5" aria-label="Command center">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-[0.08em] text-slate-100">Command center</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="weather-chip inline-flex min-h-[44px] items-center px-3 py-2 text-[10px] font-semibold tracking-[0.16em] text-slate-300">
            {totalResults} links
          </span>
          {topMatch ? (
            <a
              href={topMatch.href}
              className="weather-pill hidden min-h-[44px] items-center px-3 py-2 text-[10px] font-semibold tracking-[0.16em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation sm:inline-flex"
            >
              {isInPageLink(topMatch.href) ? "Open top section" : "Open top page"}
            </a>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr,auto] lg:items-start">
        <label htmlFor="operator-command-search" className="sr-only">
          Search links
        </label>
        <input
          ref={searchInputRef}
          id="operator-command-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search… (/ to focus)"
          className="w-full rounded-2xl border border-slate-700/80 bg-slate-950/80 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
        />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {filterOrder.map((item) => {
              const isActive = item === filter;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-[10px] font-semibold tracking-[0.16em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation ${
                    isActive
                      ? "border-sky-400/70 bg-sky-500/15 text-sky-100"
                      : "text-slate-300 hover:border-sky-400/70 hover:text-slate-100"
                  }`}
                  aria-pressed={isActive}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-400">{filterHelper[filter]}</p>
        </div>
      </div>

      {totalResults === 0 ? (
        <p className="rounded-2xl border border-slate-800/70 bg-slate-950/50 px-3 py-3 text-sm text-slate-300">
          No matches.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          {(Object.keys(groupedActions) as OperatorCommandAction["group"][]).map((group) => {
            if (groupedActions[group].length === 0) {
              return null;
            }

            return (
              <section key={group} className="weather-surface relative z-10 space-y-2 p-3">
                <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400">{group}</p>
                <ul className="space-y-2">
                  {groupedActions[group].map((action) => (
                    <li key={`${group}-${action.href}`}>
                      <a
                        href={action.href}
                        className="weather-pill inline-flex min-h-[44px] w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
                        title={action.description}
                        aria-label={`${action.label} (${isInPageLink(action.href) ? "section jump" : "page navigation"})`}
                      >
                        <span className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold tracking-[0.12em] text-slate-100">
                          <span aria-hidden="true" className="text-slate-400">
                            {groupGlyph[action.group]}
                          </span>
                          {action.label}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          {isInPageLink(action.href) ? (
                            <span className="rounded-full border border-slate-700/70 px-2 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-slate-400">
                              SECTION
                            </span>
                          ) : (
                            <span className="rounded-full border border-slate-700/70 px-2 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-slate-400">
                              PAGE
                            </span>
                          )}
                          <span aria-hidden="true" className="text-xs text-slate-500">→</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
};
