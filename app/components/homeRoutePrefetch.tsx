"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const PREFETCH_PATHS = ["/operations", "/signals", "/method", "/decide"] as const;

type NavigatorConnection = {
  saveData?: boolean;
  effectiveType?: string;
};

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

const canWarmRoutes = () => {
  if (typeof navigator === "undefined") {
    return true;
  }

  const connection = (navigator as Navigator & { connection?: NavigatorConnection }).connection;
  if (!connection) {
    return true;
  }

  return !connection.saveData && connection.effectiveType !== "slow-2g" && connection.effectiveType !== "2g";
};

export function HomeRoutePrefetch() {
  const router = useRouter();

  useEffect(() => {
    if (!canWarmRoutes()) {
      return;
    }

    const idleWindow = window as IdleWindow;
    const warm = () => {
      for (const path of PREFETCH_PATHS) {
        router.prefetch(path);
      }
    };

    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(warm, { timeout: 1200 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(warm, 300);
    return () => window.clearTimeout(timeoutId);
  }, [router]);

  return null;
}
