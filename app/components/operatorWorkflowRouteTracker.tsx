"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  isOperatorWorkflowRoute,
  operatorWorkflowRouteStorageKey,
  trackOperatorWorkflowEvent,
} from "../../lib/operatorWorkflowTelemetry";

export function OperatorWorkflowRouteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !isOperatorWorkflowRoute(pathname)) {
      return;
    }

    try {
      const previousPath = window.sessionStorage.getItem(operatorWorkflowRouteStorageKey);
      if (
        previousPath &&
        previousPath !== pathname &&
        isOperatorWorkflowRoute(previousPath)
      ) {
        trackOperatorWorkflowEvent({
          type: "route_transition",
          path: pathname,
          fromPath: previousPath,
          toPath: pathname,
        });
      }

      window.sessionStorage.setItem(operatorWorkflowRouteStorageKey, pathname);
    } catch {
      // Ignore storage errors.
    }
  }, [pathname]);

  return null;
}
