"use client";

import { useEffect, useRef, type ReactNode } from "react";

type ResponsiveDetailsPanelProps = {
  children: ReactNode;
  className?: string;
  desktopMinWidth?: number;
  summary: string;
  summaryClassName?: string;
};

export const ResponsiveDetailsPanel = ({
  children,
  className,
  desktopMinWidth = 640,
  summary,
  summaryClassName,
}: ResponsiveDetailsPanelProps) => {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const hasUserInteractedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const detailsElement = detailsRef.current;
    if (!detailsElement) {
      return;
    }

    const desktopQuery = window.matchMedia(`(min-width: ${desktopMinWidth}px)`);
    const syncOpenState = (matches: boolean) => {
      if (hasUserInteractedRef.current) {
        return;
      }
      detailsElement.open = matches;
    };

    syncOpenState(desktopQuery.matches);

    const handleDesktopChange = (event: MediaQueryListEvent) => {
      syncOpenState(event.matches);
    };

    desktopQuery.addEventListener("change", handleDesktopChange);

    return () => {
      desktopQuery.removeEventListener("change", handleDesktopChange);
    };
  }, [desktopMinWidth]);

  useEffect(() => {
    const detailsElement = detailsRef.current;
    if (!detailsElement) {
      return;
    }

    const handleToggle = () => {
      hasUserInteractedRef.current = true;
    };

    detailsElement.addEventListener("toggle", handleToggle);

    return () => {
      detailsElement.removeEventListener("toggle", handleToggle);
    };
  }, []);

  return (
    <details ref={detailsRef} className={className}>
      <summary className={summaryClassName}>{summary}</summary>
      {children}
    </details>
  );
};
