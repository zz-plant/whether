"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { useHydrated } from "./browserSource";
import { SegmentedControl, type SegmentedOption } from "./ui/segmentedControl";

type CadenceKey = "weekly" | "monthly" | "quarterly";

const CADENCES: readonly SegmentedOption<CadenceKey>[] = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
];

const DEFAULT_CADENCE: CadenceKey = "weekly";

function buildHref(
  pathname: string,
  searchParams: URLSearchParams | null,
  value: CadenceKey,
) {
  const params = new URLSearchParams(searchParams?.toString() ?? "");
  if (value === DEFAULT_CADENCE) {
    params.delete("cadence");
  } else {
    params.set("cadence", value);
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * The planning horizon the brief is stated for.
 *
 * `replace`, not `push`: choosing a horizon is a view of this page, not a
 * journey to another one, so Back should leave the brief rather than undo a
 * filter three times. `UrlDetails` records the same reasoning for the
 * disclosure panels, and the stage selector now agrees.
 *
 * It used to sit at the foot of the page while the card it controls renders at
 * the top, and compensated with a `scrollIntoView` back up — so operating the
 * control correctly required an involuntary scroll. It now sits in the meta row
 * beside the week switcher, where the page's other period controls are, and
 * needs no reveal.
 */
export function CadenceSelector({ onNavigate }: { onNavigate?: (key: string) => void } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname() ?? "/";
  /* The server rendered the default, so the first client render has to as well;
     the query string is only safe to read once hydration is past. */
  const hydrated = useHydrated();
  const current = hydrated
    ? ((searchParams?.get("cadence") as CadenceKey | null) ?? DEFAULT_CADENCE)
    : DEFAULT_CADENCE;

  const navigate = useCallback(
    (key: CadenceKey) => {
      router.replace(buildHref(pathname, searchParams, key), { scroll: false });
      onNavigate?.(key);
    },
    [pathname, searchParams, router, onNavigate],
  );

  const prefetch = useCallback(
    (key: CadenceKey) => {
      router.prefetch(buildHref(pathname, searchParams, key));
    },
    [pathname, searchParams, router],
  );

  return (
    <SegmentedControl
      options={CADENCES}
      value={CADENCES.some((option) => option.key === current) ? current : DEFAULT_CADENCE}
      onSelect={navigate}
      onPrefetch={prefetch}
      ariaLabel="Planning horizon"
    />
  );
}
