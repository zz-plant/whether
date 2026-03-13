/**
 * DisplayGuardian keeps the report stable for always-on wall displays by refreshing data,
 * preventing sleep where possible, and subtly shifting pixels to reduce burn-in risk.
 */
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type DisplayGuardianProps = {
  refreshMinutes?: number;
  driftPixels?: number;
  driftIntervalSeconds?: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const DisplayGuardian = ({
  refreshMinutes = 10,
  driftPixels = 2,
  driftIntervalSeconds = 45,
}: DisplayGuardianProps) => {
  const router = useRouter();
  const lastInteractionAt = useRef(Date.now());
  const lastRefreshAt = useRef(Date.now());

  useEffect(() => {
    const max = clamp(Math.round(driftPixels), 1, 6);
    const duration = clamp(driftIntervalSeconds, 15, 180);
    document.documentElement.style.setProperty("--display-drift-distance", `${max}px`);
    document.documentElement.style.setProperty("--display-drift-duration", `${duration}s`);
  }, [driftIntervalSeconds, driftPixels]);

  useEffect(() => {
    const refreshMs = clamp(refreshMinutes, 2, 60) * 60 * 1000;
    let heartbeatTimer: number | null = null;

    const refreshIfStale = () => {
      const now = Date.now();
      const idleMs = now - lastInteractionAt.current;
      const elapsedSinceRefresh = now - lastRefreshAt.current;

      if (idleMs >= refreshMs || elapsedSinceRefresh >= refreshMs) {
        lastRefreshAt.current = now;
        router.refresh();
      }
    };

    const updateInteraction = () => {
      lastInteractionAt.current = Date.now();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshIfStale();
      }
    };

    const scheduleHeartbeat = () => {
      heartbeatTimer = window.setTimeout(() => {
        refreshIfStale();
        scheduleHeartbeat();
      }, 30 * 1000);
    };

    const events = ["pointerdown", "keydown"];
    events.forEach((eventName) => {
      window.addEventListener(eventName, updateInteraction, { passive: true });
    });

    window.addEventListener("online", refreshIfStale);
    document.addEventListener("visibilitychange", handleVisibility);
    scheduleHeartbeat();

    return () => {
      if (heartbeatTimer) {
        window.clearTimeout(heartbeatTimer);
      }
      events.forEach((eventName) => {
        window.removeEventListener(eventName, updateInteraction);
      });
      window.removeEventListener("online", refreshIfStale);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshMinutes, router]);

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    let wakeTimer: number | null = null;

    const requestWakeLock = async () => {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible") {
        return;
      }

      try {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => {
          wakeLock = null;
        });
      } catch {
        // Ignore wake lock failures to keep console clean.
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      } else {
        wakeLock?.release();
        wakeLock = null;
      }
    };

    requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibility);

    wakeTimer = window.setInterval(() => {
      if (!wakeLock) {
        requestWakeLock();
      }
    }, 5 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      if (wakeTimer) {
        window.clearInterval(wakeTimer);
      }
      wakeLock?.release();
      wakeLock = null;
    };
  }, []);

  return null;
};
