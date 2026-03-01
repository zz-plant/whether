"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";

type LegacyRouteBridgeProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref: Route;
  primaryLabel: string;
  secondaryHref: Route;
  secondaryLabel: string;
  autoForwardSeconds?: number;
};

export function LegacyRouteBridge({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  autoForwardSeconds = 8,
}: LegacyRouteBridgeProps) {
  const preferenceKey = useMemo(
    () => `whether.bridge.auto-forward-seen:${primaryHref}`,
    [primaryHref],
  );
  const [isClient, setIsClient] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(autoForwardSeconds);
  const [autoForwardEnabled, setAutoForwardEnabled] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) {
      return;
    }

    const hasSeenBridge = window.localStorage.getItem(preferenceKey) === "1";
    setAutoForwardEnabled(hasSeenBridge);
    if (!hasSeenBridge) {
      window.localStorage.setItem(preferenceKey, "1");
    }
  }, [isClient, preferenceKey]);

  useEffect(() => {
    if (!autoForwardEnabled || secondsLeft <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSecondsLeft((value) => value - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [autoForwardEnabled, secondsLeft]);

  useEffect(() => {
    if (!autoForwardEnabled || secondsLeft > 0) {
      return;
    }

    window.location.assign(primaryHref);
  }, [autoForwardEnabled, primaryHref, secondsLeft]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <section className="mx-auto max-w-3xl space-y-6 weather-panel-static px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">{eyebrow}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">{title}</h1>
        <p className="text-sm leading-7 text-slate-300 sm:text-base">{description}</p>
        <p className="text-xs text-slate-400">
          {!isClient
            ? "Checking redirect preference..."
            : autoForwardEnabled
            ? `Auto-forwarding to the primary destination in ${secondsLeft}s.`
            : "Auto-forward is off for first-time visitors. Choose your next destination below."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={primaryHref}
            className="weather-button-primary inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
          >
            {primaryLabel}
          </Link>
          <Link
            href={secondaryHref}
            className="weather-button inline-flex min-h-[44px] items-center px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
          >
            {secondaryLabel}
          </Link>
          {!isClient ? null : autoForwardEnabled ? (
            <button
              type="button"
              onClick={() => setAutoForwardEnabled(false)}
              className="inline-flex min-h-[44px] items-center rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200"
            >
              Stay on this page
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSecondsLeft(autoForwardSeconds);
                setAutoForwardEnabled(true);
              }}
              className="inline-flex min-h-[44px] items-center rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200"
            >
              Enable auto-forward
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
