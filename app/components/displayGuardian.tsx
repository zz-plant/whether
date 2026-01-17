/**
 * DisplayGuardian keeps the report stable for always-on wall displays by refreshing data,
 * preventing sleep where possible, and subtly shifting pixels to reduce burn-in risk.
 */
"use client";

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
  const lastInteractionAt = useRef(Date.now());

  useEffect(() => {
    const max = clamp(Math.round(driftPixels), 1, 6);
    const duration = clamp(driftIntervalSeconds, 15, 180);
    document.documentElement.style.setProperty("--display-drift-distance", `${max}px`);
    document.documentElement.style.setProperty("--display-drift-duration", `${duration}s`);
  }, [driftIntervalSeconds, driftPixels]);

  useEffect(() => {
    const refreshMs = clamp(refreshMinutes, 2, 60) * 60 * 1000;
    const updateInteraction = () => {
      lastInteractionAt.current = Date.now();
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((eventName) => {
      window.addEventListener(eventName, updateInteraction, { passive: true });
    });
    const refreshTimer = window.setInterval(() => {
      const now = Date.now();
      const idleMs = now - lastInteractionAt.current;
      if (idleMs >= refreshMs) {
        window.location.reload();
      }
    }, refreshMs);

    return () => {
      window.clearInterval(refreshTimer);
      events.forEach((eventName) => {
        window.removeEventListener(eventName, updateInteraction);
      });
    };
  }, [refreshMinutes]);

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
