"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const CADENCES = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
] as const;

const VIEWS = [
  { key: "default", label: "Default" },
  { key: "sector", label: "Sector" },
  { key: "company", label: "Company" },
  { key: "financial", label: "Financial" },
  { key: "forecast", label: "Posture" },
] as const;

type SegmentOption = { key: string; label: string };

type SegmentControlProps = {
  options: readonly SegmentOption[];
  paramName: string;
  defaultKey: string;
  ariaLabel: string;
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

function SegmentControl({ options, paramName, defaultKey, ariaLabel }: SegmentControlProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname() ?? "/";
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? (searchParams?.get(paramName) ?? defaultKey) : defaultKey;
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const activeIndex = Math.max(
    options.findIndex((option) => option.key === current),
    0,
  );

  const navigate = useCallback(
    (key: string) => {
      const href = buildHref(pathname, searchParams, paramName, key, defaultKey);
      router.replace(href, { scroll: false });
    },
    [pathname, searchParams, paramName, defaultKey, router],
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowLeft" ? -1 : 1;
    const nextIndex = (activeIndex + delta + options.length) % options.length;
    const nextKey = options[nextIndex]?.key ?? defaultKey;
    moveFocus(nextIndex);
    navigate(nextKey);
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className="flex items-center gap-0.5 rounded-sm border border-white/[0.10] bg-[var(--bg-nested)] p-0.5"
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
            onClick={() => navigate(option.key)}
            onMouseEnter={() => prefetch(option.key)}
            onFocus={() => prefetch(option.key)}
            // 44px stays on touch; sm: drops to the 36px pointer size the header
            // already uses for its primary action. The chips set the height of the
            // first header band, which was 62px of a 109px two-band shell.
            className={`min-h-[44px] sm:min-h-9 min-w-[2.75rem] rounded-sm px-3 py-1.5 text-fluid-micro font-semibold transition-colors active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
              isActive
                ? "bg-sky-500/14 text-sky-100"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function CadenceSelector() {
  return (
    <SegmentControl
      options={CADENCES}
      paramName="cadence"
      defaultKey="weekly"
      ariaLabel="Cadence"
    />
  );
}

// Interpretation views are an optional translation layer (see the one-screen brief
// spec) — a compact select instead of five always-visible segments keeps the header
// from competing with the weekly call.
export function ViewSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname() ?? "/";
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? (searchParams?.get("view") ?? "default") : "default";
  const isNonDefault = current !== "default";

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Interpretation view</span>
      <select
        value={current}
        onChange={(event) => {
          const href = buildHref(pathname, searchParams, "view", event.target.value, "default");
          router.replace(href, { scroll: false });
        }}
        className={`min-h-[44px] sm:min-h-9 cursor-pointer appearance-none rounded-sm border bg-[var(--bg-nested)] py-1.5 pl-3 pr-8 text-fluid-micro font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
          isNonDefault
            ? "border-sky-500/40 text-sky-100"
            : "border-white/[0.10] text-slate-400 hover:text-slate-200"
        }`}
      >
        {VIEWS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.key === "default" ? "View: Default" : `View: ${option.label}`}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className={`pointer-events-none absolute right-2.5 size-3.5 ${isNonDefault ? "text-sky-300" : "text-slate-500"}`}
      />
    </label>
  );
}
