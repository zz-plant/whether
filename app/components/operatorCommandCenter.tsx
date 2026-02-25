"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { handleDirectionalFocus } from "./directionalFocus";

export type OperatorCommandAction = {
  href: string;
  label: string;
  description: string;
  group: "Playbook" | "Pages" | "Sections";
  tags?: Array<"Playbook" | "Pages" | "Sections">;
  keywords?: string[];
};

type CommandFilter = "All" | OperatorCommandAction["group"];

const STORAGE_KEY = "whether-command-center-query";
const FILTER_STORAGE_KEY = "whether-command-center-filter";
const VISITED_KEY = "whether-command-center-visited";
const MAX_RESULTS = 12;
const filterOrder: CommandFilter[] = ["All", "Playbook", "Pages", "Sections"];
const groupOrder: OperatorCommandAction["group"][] = ["Playbook", "Pages", "Sections"];

const filterClassName =
  "weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-[10px] font-semibold tracking-[0.16em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation";
const commandButtonClassName =
  "weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-[10px] font-semibold tracking-[0.16em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation";

const filterDescriptions: Record<CommandFilter, string> = {
  All: "All results across actions, pages, and sections.",
  Playbook: "Recommended actions you can take right now.",
  Pages: "Switch to a different report surface.",
  Sections: "Jump to a specific section on this page.",
};

const groupGlyph: Record<OperatorCommandAction["group"], string> = {
  Playbook: "⚡",
  Pages: "◉",
  Sections: "↳",
};

const normalize = (value: string) => value.toLowerCase().trim();
const isCommandFilter = (value: string): value is CommandFilter => filterOrder.includes(value as CommandFilter);

const buildSearchTarget = (action: OperatorCommandAction) =>
  `${action.label} ${action.description} ${action.group} ${(action.keywords ?? []).join(" ")}`.toLowerCase();

const tagLabelMap: Record<OperatorCommandAction["group"], string> = {
  Playbook: "ACTION",
  Pages: "PAGE",
  Sections: "OPEN SECTION",
};

const getTagLabel = (tag: OperatorCommandAction["group"]) => tagLabelMap[tag];

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
  const [isMobile, setIsMobile] = useState(false);
  const [isFirstSession, setIsFirstSession] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const commandCenterRef = useRef<HTMLElement | null>(null);

  const onDirectionalKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!commandCenterRef.current) {
      return;
    }

    handleDirectionalFocus(event, commandCenterRef.current, { wrap: true });
  };

  useEffect(() => {
    const initialQuery = sessionStorage.getItem(STORAGE_KEY);
    if (initialQuery) {
      setQuery(initialQuery);
    }

    const storedFilter = sessionStorage.getItem(FILTER_STORAGE_KEY);
    if (storedFilter && isCommandFilter(storedFilter)) {
      setFilter(storedFilter);
    }

    const mobileMedia = window.matchMedia("(max-width: 639px)");
    const applyViewport = () => setIsMobile(mobileMedia.matches);
    applyViewport();

    const visited = window.localStorage.getItem(VISITED_KEY) === "1";
    if (!visited) {
      setIsFirstSession(true);
      setIsExpanded(false);
    }

    if (!storedFilter) {
      setFilter(mobileMedia.matches ? "Playbook" : "All");
    }

    const onChange = () => {
      applyViewport();
      setFilter((current) => {
        if (current !== "All" && current !== "Playbook") {
          return current;
        }
        return mobileMedia.matches ? "Playbook" : "All";
      });
    };

    mobileMedia.addEventListener("change", onChange);
    return () => {
      mobileMedia.removeEventListener("change", onChange);
    };
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, query);
  }, [query]);

  useEffect(() => {
    sessionStorage.setItem(FILTER_STORAGE_KEY, filter);
  }, [filter]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (isTextInputTarget(event.target)) {
          return;
        }

        event.preventDefault();
        if (!isExpanded) {
          setIsExpanded(true);
        }
        searchInputRef.current?.focus();
      }

      if (event.key === "Escape" && document.activeElement === searchInputRef.current) {
        setQuery("");
      }

      if (event.key === "Backspace" && document.activeElement === searchInputRef.current && query.length === 0) {
        setIsExpanded(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isExpanded, query.length]);

  useEffect(() => {
    if (!isExpanded || !commandCenterRef.current) {
      return;
    }

    const isTvMode = document.documentElement.dataset.displayMode === "tv";
    if (!isTvMode) {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement && commandCenterRef.current.contains(activeElement)) {
      return;
    }

    const firstFocusable = commandCenterRef.current.querySelector<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    firstFocusable?.focus();
  }, [isExpanded]);

  const groupedActions = useMemo(() => {
    const normalizedQuery = normalize(query);
    const filtered = actions.filter((action) => {
      const actionTags = action.tags ?? [action.group];
      const target = buildSearchTarget(action);
      const queryMatches = normalizedQuery.length === 0 || target.includes(normalizedQuery);
      const filterMatches = filter === "All" || actionTags.includes(filter);

      return queryMatches && filterMatches;
    });

    return filtered.slice(0, MAX_RESULTS).reduce<Record<OperatorCommandAction["group"], OperatorCommandAction[]>>(
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

  const handleExpand = () => {
    setIsExpanded(true);
    if (isFirstSession) {
      setIsFirstSession(false);
      window.localStorage.setItem(VISITED_KEY, "1");
    }
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
  };

  const handleReset = () => {
    setQuery("");
    setFilter(isMobile ? "Playbook" : "All");
    searchInputRef.current?.focus();
  };

  const defaultFilter = isMobile ? "Playbook" : "All";
  const hasActiveRefinement = query.length > 0 || filter !== defaultFilter;

  return (
    <section
      ref={commandCenterRef}
      onKeyDown={onDirectionalKeyDown}
      id="operator-command-center"
      className="weather-panel relative z-10 space-y-4 px-4 py-4 sm:px-5"
      aria-label="Command center"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-[0.08em] text-slate-100">Command center</h2>
        <div className="flex flex-wrap items-center gap-2">
          {isExpanded ? (
            <button
              type="button"
              onClick={handleCollapse}
              className={commandButtonClassName}
            >
              Collapse
            </button>
          ) : null}
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

      {!isExpanded ? (
        <div className="weather-surface space-y-3 p-4">
          {isFirstSession ? (
            <p className="text-sm text-slate-200">
              This page content is available below. Open command center any time to jump.
            </p>
          ) : (
            <p className="text-sm text-slate-200">
              Command center is collapsed. Open it to jump to actions, pages, or sections.
            </p>
          )}
          <button
            type="button"
            onClick={handleExpand}
            className="weather-pill inline-flex min-h-[44px] items-center px-3 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 transition-colors hover:border-sky-400/70 hover:text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 touch-manipulation"
          >
            Open command center
          </button>
        </div>
      ) : null}

      {isExpanded ? (
        <>
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
              placeholder="Search links"
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
                      className={`${filterClassName} ${
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
              <p className="text-xs text-slate-300">{filterDescriptions[filter]}</p>
              <p className="text-xs text-slate-400">
                Playbook = Recommended actions · Pages = Switch surfaces · Sections = Open section.
              </p>
              {isMobile ? (
                <details className="weather-surface p-3">
                  <summary className="cursor-pointer list-none text-xs font-semibold tracking-[0.12em] text-slate-300 focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">
                    Tips for keyboard and remote users
                  </summary>
                  <p className="mt-2 text-xs text-slate-400">Mobile default is Playbook for faster “do now” access.</p>
                  <div className="mt-2 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                    <p><span className="font-semibold text-slate-100">↑/↓</span> move focus</p>
                    <p><span className="font-semibold text-slate-100">←/→</span> switch controls</p>
                    <p><span className="font-semibold text-slate-100">Enter / OK</span> open link</p>
                    <p><span className="font-semibold text-slate-100">Esc / Back</span> clear search field</p>
                  </div>
                </details>
              ) : null}
              {hasActiveRefinement ? (
                <button
                  type="button"
                  onClick={handleReset}
                  className={commandButtonClassName}
                >
                  Reset search
                </button>
              ) : null}
              {!isMobile ? (
                <div className="weather-surface grid gap-2 p-3 text-xs text-slate-300 sm:grid-cols-2">
                  <p><span className="font-semibold text-slate-100">↑/↓</span> move focus</p>
                  <p><span className="font-semibold text-slate-100">←/→</span> switch controls</p>
                  <p><span className="font-semibold text-slate-100">Enter / OK</span> open link</p>
                  <p><span className="font-semibold text-slate-100">Esc / Back</span> clear search field</p>
                </div>
              ) : null}
            </div>
          </div>

          {totalResults === 0 ? (
            <p className="rounded-2xl border border-slate-800/70 bg-slate-950/50 px-3 py-3 text-sm text-slate-300">
              No matches. Try broader terms or reset search.
            </p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-3">
              {groupOrder.map((group) => {
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
                              <span className="flex flex-wrap justify-end gap-1">
                                {(action.tags ?? [action.group]).map((tag) => (
                                  <span
                                    key={`${action.href}-${tag}`}
                                    className="rounded-full border border-slate-700/70 px-2 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-slate-400"
                                  >
                                    {getTagLabel(tag)}
                                  </span>
                                ))}
                              </span>
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
          <p className="sr-only" role="status" aria-live="polite">
            {totalResults} command center results shown.
          </p>
        </>
      ) : null}
    </section>
  );
};
