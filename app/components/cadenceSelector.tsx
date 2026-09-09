"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SegmentGroup } from "./ui/segmentGroup";

const CADENCES = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
] as const;

type SegmentControlProps = {
  options: readonly { key: string; label: string }[];
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

/** The URL half of the control. The chrome is `SegmentGroup`, shared with every
 *  other exclusive choice on the page. */
function SegmentControl({ options, paramName, defaultKey, ariaLabel }: SegmentControlProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname() ?? "/";
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? (searchParams?.get(paramName) ?? defaultKey) : defaultKey;

  const navigate = useCallback(
    (key: string) => {
      router.replace(buildHref(pathname, searchParams, paramName, key, defaultKey), { scroll: false });
    },
    [pathname, searchParams, paramName, defaultKey, router],
  );

  const prefetch = useCallback(
    (key: string) => {
      router.prefetch(buildHref(pathname, searchParams, paramName, key, defaultKey));
    },
    [pathname, searchParams, paramName, defaultKey, router],
  );

  return (
    <SegmentGroup
      options={options}
      activeKey={current}
      onSelect={navigate}
      onIntent={prefetch}
      ariaLabel={ariaLabel}
    />
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
