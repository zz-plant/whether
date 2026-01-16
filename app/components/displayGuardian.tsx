/**
 * DisplayGuardian keeps the report stable for always-on wall displays by refreshing data,
 * preventing sleep where possible, and subtly shifting pixels to reduce burn-in risk.
 */
"use client";

import { useEffect, useMemo } from "react";

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
  const driftValues = useMemo(() => {
    const max = clamp(Math.round(driftPixels), 1, 6);
    return [-max, 0, max];
  }, [driftPixels]);

  useEffect(() => {
    let driftIndex = 0;
    const driftTimer = window.setInterval(() => {
      driftIndex += 1;
      const offsetX = driftValues[driftIndex % driftValues.length];
      const offsetY = driftValues[(driftIndex + 1) % driftValues.length];
      document.documentElement.style.setProperty("--display-offset-x", `${offsetX}px`);
      document.documentElement.style.setProperty("--display-offset-y", `${offsetY}px`);
    }, clamp(driftIntervalSeconds, 15, 180) * 1000);

    return () => window.clearInterval(driftTimer);
  }, [driftIntervalSeconds, driftValues]);

  useEffect(() => {
    const refreshMs = clamp(refreshMinutes, 2, 60) * 60 * 1000;
    const refreshTimer = window.setInterval(() => {
      window.location.reload();
    }, refreshMs);

    return () => window.clearInterval(refreshTimer);
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
      } catch (error) {
        console.warn("Wake lock unavailable.", error);
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
