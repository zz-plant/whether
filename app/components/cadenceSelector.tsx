"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

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
      className="flex items-center gap-0.5 rounded-full border border-white/[0.10] bg-[var(--bg-nested)] p-0.5"
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
            className={`min-h-[44px] sm:min-h-10 min-w-[2.75rem] rounded-full px-3 py-1.5 text-fluid-micro font-semibold transition-colors active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
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

export function ViewSelector() {
  return (
    <SegmentControl
      options={VIEWS}
      paramName="view"
      defaultKey="default"
      ariaLabel="View"
    />
  );
}
