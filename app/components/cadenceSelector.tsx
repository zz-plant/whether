"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useRef } from "react";
import { useHydrated } from "./browserSource";
import { scrollBehaviorFor } from "./scrollRowToItem";

const CADENCES = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
] as const;

type SegmentOption = { key: string; label: string };

type SegmentControlProps = {
  options: readonly SegmentOption[];
  paramName: string;
  defaultKey: string;
  ariaLabel: string;
  /** Runs after the URL updates. Lets a client caller reveal the content the new cadence renders. */
  onNavigate?: (key: string) => void;
  /**
   * Element to scroll into view after the URL updates, by id. A server page
   * cannot hand a client control a function — React refuses the render — so
   * the reveal is declared as data. The homepage selector sits below the fold
   * while the cadence card it controls renders in `#weekly-call`; without the
   * reveal a change moved content only where the reader could not see it.
   */
  revealTargetId?: string;
};

function buildHref(pathname: string, searchParams: URLSearchParams | null, paramName: string, value: string, defaultKey: string) {
  const params = new URLSearchParams(searchParams?.toString() ?? "");
  if (value === defaultKey) {
    params.delete(paramName);
  } else {
    params.set(paramName, value);
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function SegmentControl({ options, paramName, defaultKey, ariaLabel, onNavigate, revealTargetId }: SegmentControlProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname() ?? "/";
  /* The server rendered the default, so the first client render has to as well;
     the query string is only safe to read once hydration is past. */
  const current = useHydrated() ? (searchParams?.get(paramName) ?? defaultKey) : defaultKey;
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const activeIndex = Math.max(
    options.findIndex((option) => option.key === current),
    0,
  );

  const navigate = useCallback(
    (key: string) => {
      const href = buildHref(pathname, searchParams, paramName, key, defaultKey);
      router.replace(href, { scroll: false });
      if (revealTargetId) {
        document
          .getElementById(revealTargetId)
          ?.scrollIntoView({ behavior: scrollBehaviorFor(true), block: "start" });
      }
      onNavigate?.(key);
    },
    [pathname, searchParams, paramName, defaultKey, router, onNavigate, revealTargetId],
  );

  const prefetch = useCallback(
    (key: string) => {
      const href = buildHref(pathname, searchParams, paramName, key, defaultKey);
      router.prefetch(href);
    },
    [pathname, searchParams, paramName, defaultKey, router],
  );

  const moveFocus = (nextIndex: number) => {
    buttonsRef.current[nextIndex]?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowLeft" ? -1 : 1;
    const nextIndex = (activeIndex + delta + options.length) % options.length;
    const nextKey = options[nextIndex]?.key ?? defaultKey;
    moveFocus(nextIndex);
    navigate(nextKey);
  };

  return (
    <fieldset
      aria-label={ariaLabel}
      className="flex items-center gap-0.5 rounded-sm border border-[color:var(--border-subtle)] bg-[color:var(--bg-nested)] p-0.5"
    >
      {options.map((option, index) => {
        const isActive = current === option.key;
        return (
          <button
            key={option.key}
            ref={(el) => {
              buttonsRef.current[index] = el;
            }}
            type="button"
            aria-current={isActive ? "true" : undefined}
            onKeyDown={handleKeyDown}
            onClick={() => navigate(option.key)}
            onMouseEnter={() => prefetch(option.key)}
            onFocus={() => prefetch(option.key)}
            // 44px stays on touch; sm: drops to the 36px pointer size the header
            // already uses for its primary action. The chips set the height of the
            // first header band, which was 62px of a 109px two-band shell.
            className={`min-h-[44px] sm:min-h-9 min-w-[2.75rem] rounded-sm px-3 py-1.5 text-fluid-micro font-semibold transition-colors active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
              isActive
                ? "bg-sky-500/15 text-sky-100 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </fieldset>
  );
}

export function CadenceSelector({
  onNavigate,
  revealTargetId,
}: {
  onNavigate?: (key: string) => void;
  revealTargetId?: string;
}) {
  return (
    <SegmentControl
      options={CADENCES}
      paramName="cadence"
      defaultKey="weekly"
      ariaLabel="Cadence"
      onNavigate={onNavigate}
      revealTargetId={revealTargetId}
    />
  );
}
