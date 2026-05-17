"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";

type CompactDisclosureProps = {
  summary: string;
  preview?: string;
  className?: string;
  summaryClassName: string;
  children: ReactNode;
  id?: string;
  queryKey?: string;
  queryValue?: string;
  defaultOpen?: boolean;
};

export const resolveDisclosureInitialOpen = (
  searchParams: Pick<URLSearchParams, "get"> | null,
  queryKey?: string,
  queryValue = "1",
  defaultOpen = false,
) => {
  if (!queryKey) {
    return defaultOpen;
  }

  return searchParams?.get(queryKey) === queryValue;
};

export const buildDisclosureHref = (
  pathname: string,
  searchParams: Pick<URLSearchParams, "toString"> | null,
  queryKey: string,
  nextOpen: boolean,
  queryValue = "1",
) => {
  const nextParams = new URLSearchParams(searchParams?.toString() ?? "");

  if (nextOpen) {
    nextParams.set(queryKey, queryValue);
  } else {
    nextParams.delete(queryKey);
  }

  const nextQuery = nextParams.toString();
  return nextQuery.length > 0 ? `${pathname}?${nextQuery}` : pathname;
};

export function CompactDisclosure({
  summary,
  preview,
  className,
  summaryClassName,
  children,
  id,
  queryKey,
  queryValue = "1",
  defaultOpen = false,
}: CompactDisclosureProps) {
  const searchParams = useSearchParams();
  const initialOpen = resolveDisclosureInitialOpen(searchParams, queryKey, queryValue, defaultOpen);
  const [open, setOpen] = useState(initialOpen);

  useEffect(() => {
    setOpen(initialOpen);
  }, [initialOpen]);

  useEffect(() => {
    if (!queryKey) {
      return undefined;
    }

    const handlePopState = () => {
      setOpen(resolveDisclosureInitialOpen(new URLSearchParams(window.location.search), queryKey, queryValue, defaultOpen));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [defaultOpen, queryKey, queryValue]);

  return (
    <details
      id={id}
      open={open}
      onToggle={(event) => {
        const nextOpen = event.currentTarget.open;
        setOpen(nextOpen);

        if (!queryKey) {
          return;
        }

        const nextHref = buildDisclosureHref(window.location.pathname, new URLSearchParams(window.location.search), queryKey, nextOpen, queryValue);
        const currentHref = `${window.location.pathname}${window.location.search}`;

        if (nextHref === currentHref) {
          return;
        }

        window.history.pushState({}, "", `${nextHref}${window.location.hash}`);
      }}
      className={className}
    >
      <summary className={`${summaryClassName} cursor-pointer list-none`}>
        <span className="min-w-0 flex-1">
          <span className="block">{summary}</span>
          {preview ? (
            <span className="mt-1 block text-fluid-xs font-normal normal-case tracking-normal text-slate-400">
              {preview}
            </span>
          ) : null}
        </span>
        <span aria-hidden="true" className="text-sm transition group-open:rotate-180">▾</span>
      </summary>
      {children}
    </details>
  );
}
