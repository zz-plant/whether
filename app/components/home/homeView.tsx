"use client";

import { useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { decisionAreaLabel, isDecisionArea, type DecisionArea } from "../../../lib/report/boundedDecisionRules";
import { HOME_DECISION_PARAM } from "../../../lib/report/home/homeSectionModel";
import { AreaIcon } from "../ui/conceptIcons";
import { ActionLink } from "../ui/actionLink";

/*
 * The views of `/` a reader switches in place (2026-11-18): the area open (`?decision=`),
 * the change the last-time card compares with (`?compare=`) and how far back the market
 * inputs' trails reach (`?trail=`). Each is a query key (ui-ux-standards §V), so a copied
 * link opens on it and the server renders it on a full load.
 *
 * Once the page is live a choice is taken here and the URL replaced, not navigated: a
 * navigation on `/` swaps in the route's loading shell (`app/loading.tsx`), which drops the
 * reader's focus and scroll for a choice that changes one section. The conditions chart
 * keeps its area the same way (`RuleRegionsChart`). Several islands can show one key — the
 * picker and "What changed" both show the area, the two trails one reach — so a choice is
 * kept in this store, and every island on that key follows it.
 */
const chosen = new Map<string, string | null>();
const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};

/*
 * The area is also named by the conditions chart's chooser, its own island. The two speak
 * through one document event (2026-11-18): whichever names an area writes `?decision=` and
 * the cookie, then sends `whether:decision` with the area and its own `source`; each follows
 * the other's and ignores its own. The chart's area follows the picker, and the picker, the
 * rows of "What changed" and Copy brief follow the chart.
 */
const DECISION_EVENT = "whether:decision";
const PICKER_SOURCE = "decision-picker";
let hearingDecisions = false;
const hearDecisions = () => {
  if (hearingDecisions || typeof document === "undefined") return;
  hearingDecisions = true;
  document.addEventListener(DECISION_EVENT, (event) => {
    const detail: unknown = event instanceof CustomEvent ? event.detail : null;
    if (typeof detail !== "object" || detail === null || !("source" in detail) || detail.source === PICKER_SOURCE) return;
    const area = "area" in detail && typeof detail.area === "string" && isDecisionArea(detail.area) ? detail.area : null;
    chosen.set(HOME_DECISION_PARAM, area);
    emit();
  });
};

/** The picker names an area: the chart and anything else listening follows. */
export const announceDecision = (area: DecisionArea) =>
  document.dispatchEvent(new CustomEvent(DECISION_EVENT, { detail: { area, source: PICKER_SOURCE } }));

const subscribe = (listener: () => void) => {
  hearDecisions();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * The value a key names on this page. Server and hydration read the server's, which can
 * come from somewhere other than the URL: the area a reader last picked is a cookie. A
 * value chosen here (`showHomeView`) holds while the address bar still says it; once it
 * does not (a navigation, or another island replacing the URL), the address bar's holds.
 * The router's own search params do not hear a `replaceState` that keeps its history
 * entry, so the address bar is read directly, and only after a choice made here.
 */
export const useHomeView = (key: string, initial: string | null): string | null => {
  const inUrl = useSearchParams()?.get(key) ?? null;
  const here = useSyncExternalStore(
    subscribe,
    () => chosen.get(key),
    () => undefined,
  );
  if (here === undefined) return inUrl ?? initial;
  const now = new URLSearchParams(window.location.search).get(key);
  return now === here ? here : now ?? initial;
};

/**
 * Show another view of a key: the URL is replaced, not pushed, and every island on the key
 * follows. Another island that sets one of these keys calls this rather than writing the
 * URL itself, or the islands here do not hear it.
 */
export const showHomeView = (key: string, value: string | null) => {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value);
  else url.searchParams.delete(key);
  window.history.replaceState(window.history.state, "", url);
  chosen.set(key, value);
  emit();
};

/* A click that asks for a new tab or window, or a download, is the browser's to follow. */
const isPlainClick = (event: MouseEvent<HTMLAnchorElement>) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

/**
 * A pick-one row of links to views of one key, as the conditions chart's chooser draws
 * them: each a pill, the one shown marked current. Without script each is a link to its
 * view; with it, a plain click shows the view in place.
 */
export function ViewChoices({
  param,
  current,
  choices,
  label,
  labelledBy,
  className = "",
}: {
  param: string;
  /** The value shown; null is the key's default. */
  current: string | null;
  choices: readonly { value: string | null; href: string; label: ReactNode; name: string; month?: string }[];
  /** The row's accessible name, where no visible label names it. */
  label?: string;
  labelledBy?: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} aria-labelledby={labelledBy} className={`flex flex-wrap gap-1.5 ${className}`.trim()}>
      {choices.map((choice) => {
        const active = choice.value === current;
        return (
          <ActionLink
            key={choice.value ?? "default"}
            href={choice.href}
            variant="pill"
            aria-current={active ? "page" : undefined}
            aria-label={choice.name}
            className={active ? undefined : "text-slate-300"}
            data-view-choice={choice.value ?? ""}
            onClick={(event) => {
              if (!isPlainClick(event)) return;
              event.preventDefault();
              showHomeView(param, choice.value);
            }}
          >
            {choice.label}
          </ActionLink>
        );
      })}
    </nav>
  );
}

/**
 * One of several server-rendered views, the one its key names (2026-11-18): the last-time
 * card's panels and sentence for each change on the record. Only the one shown is in the
 * page's HTML; the rest wait in the payload for a click.
 */
export function ViewSwitch({
  param,
  initial,
  fallback,
  views,
}: {
  param: string;
  /** The value the server rendered: the URL's, or null for the default. */
  initial: string | null;
  /** The view the default (null) shows. */
  fallback: string;
  views: Readonly<Record<string, ReactNode>>;
}) {
  const value = useHomeView(param, initial);
  return <>{views[value ?? fallback] ?? views[fallback] ?? null}</>;
}

/**
 * The row of choices for a `ViewSwitch`, current by the same key. A value that names the
 * default (`fallback`), or none of the views (`known`), is the default: the switch shows it.
 */
export function ViewSwitchChoices({
  param,
  initial,
  fallback,
  known,
  ...rest
}: Omit<Parameters<typeof ViewChoices>[0], "current"> & { initial: string | null; fallback: string; known: readonly string[] }) {
  const value = useHomeView(param, initial);
  const current = value === null || value === fallback || !known.includes(value) ? null : value;
  return <ViewChoices param={param} current={current} {...rest} />;
}

/**
 * Around "What changed": the area open, as `data-chosen` for the rows' ink (each row's
 * classes name the areas it does not move, `chosenAreaInk.ts`), so the rows follow the
 * picker without a round trip.
 */
export function ChosenAreaScope({
  param,
  initial,
  children,
}: {
  param: string;
  initial: DecisionArea | null;
  children: ReactNode;
}) {
  const area = useHomeView(param, initial);
  return (
    <div className="group/chosen" data-chosen={area ?? ""}>
      {children}
    </div>
  );
}

/**
 * "Moves Roadmap" under a market input that moves the open area, through the score it
 * feeds (`areasMovedBy`). Nothing when no area is open or the input does not move it.
 */
export function MovesChosenArea({
  param,
  initial,
  areas,
}: {
  param: string;
  initial: DecisionArea | null;
  /** The areas this input moves. */
  areas: readonly DecisionArea[];
}) {
  const value = useHomeView(param, initial);
  const area = areas.find((candidate) => candidate === value);
  if (!area) return null;
  return (
    <span className="block text-fluid-nano font-normal text-slate-400 [--weather-hit-up:0px]" data-moves-area={area}>
      Moves{" "}
      <a
        href={`#area-${area}`}
        className="weather-hit inline-flex items-center gap-1 align-middle font-semibold text-slate-50 underline decoration-slate-600 underline-offset-2 hover:text-sky-300"
      >
        <AreaIcon area={area} />
        {decisionAreaLabel(area)}
      </a>
    </span>
  );
}
