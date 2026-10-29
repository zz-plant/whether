"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { useHydrated } from "./browserSource";
import { SegmentedControl, type SegmentedOption } from "./ui/segmentedControl";

type CadenceKey = "weekly" | "monthly" | "quarterly";

/* Each longer horizon says what it adds (2026-10-14): "Monthly" and
   "Quarterly" beside "Plan horizon" did not say whether they change the rules,
   the wording or only the paste. They add that horizon's guidance, with its
   past months or quarters, below this week's — since 2026-10-29 the weekly
   call leads at every horizon, so the band follows the call it extends. */
const CADENCES: readonly SegmentedOption<CadenceKey>[] = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly", sublabel: "adds the month's call" },
  { key: "quarterly", label: "Quarterly", sublabel: "adds the quarter's call" },
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
 * control correctly required an involuntary scroll. It now sits directly under
 * the call beside Copy Brief: adjacent to its target without pushing the call
 * down on a phone. It needs no reveal.
 */
export function CadenceSelector({ onNavigate }: { onNavigate?: (key: string) => void } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname() ?? "/";
  /* The server rendered the default, so the first client render has to as well;
     the query string is only safe to read once hydration is past. */
  const hydrated = useHydrated();
  /* Narrowed against the options rather than asserted: `?cadence=` is whatever
     the address bar happens to hold, so a cast would have the type system
     vouch for a string nobody validated. An unknown value falls back to the
     default, which is what the server rendered for it too. */
  const inAddress = hydrated ? searchParams?.get("cadence") : null;
  const current = CADENCES.find((option) => option.key === inAddress)?.key ?? DEFAULT_CADENCE;
  /* The choice shows the moment it is made (2026-10-27). The selection used to be
     read only from the address, which changes when the server's answer lands: on a
     phone, which never prefetches because it never hovers, a tap lit nothing for
     about 800ms. Until the address catches up the group is busy and the chosen
     lamp breathes; once it does, the address is the only source again. */
  const [chosen, setChosen] = useState<CadenceKey | null>(null);
  if (chosen !== null && chosen === current) setChosen(null);

  const navigate = useCallback(
    (key: CadenceKey) => {
      setChosen(key);
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
      value={chosen ?? current}
      busy={chosen !== null}
      onSelect={navigate}
      onPrefetch={prefetch}
      ariaLabel="Planning horizon"
    />
  );
}
