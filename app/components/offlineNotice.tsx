/**
 * Says which reading you are looking at when the network is gone.
 *
 * The service worker serves the last copy of a page this browser saw, which is
 * the point of installing the app — and a week-old brief rendered silently as
 * though it were current is the failure this repo has already paid for twice,
 * in the freeze job that published a ten-week-old record and exited 0, and in
 * the cron step that reported success for work it never observed. A cache is
 * only honest if it says what it is showing.
 *
 * So the service worker caches and this names the date. It takes the record
 * date the page already rendered rather than reading one, which is what makes
 * the claim true by construction: whatever reading is on the screen is the one
 * named here.
 *
 * The rule, since 2026-09-17: a route that renders a reading mounts this; a
 * route that does not — the glossary, privacy, the API docs — needs nothing,
 * because a cached copy of those makes no claim that can go stale. It shipped
 * on `/` alone while the worker cached every document, so /trust and /signals
 * served a previous visit's readings unlabelled. It is mounted in
 * `reportShell.tsx` now, which every reading route but `/` is built on.
 */
"use client";

import { createBrowserSource, useBrowserSource } from "./browserSource";

/* `navigator.onLine` is famously "connected to something", not "can reach us" —
   it says nothing about a captive portal. That is fine for this use: the false
   negative is a notice that does not appear, leaving the page exactly as it is
   without this component, and the service worker's cached response is served
   either way. It is never the reason a reader is shown stale data unlabelled,
   because the label is the only thing it controls. */
const onlineSource = createBrowserSource<boolean>({
  read: () => (typeof navigator === "undefined" ? true : navigator.onLine),
  serverValue: true,
  watch: (onChange) => {
    window.addEventListener("online", onChange);
    window.addEventListener("offline", onChange);
    return () => {
      window.removeEventListener("online", onChange);
      window.removeEventListener("offline", onChange);
    };
  },
});

const useOnline = (): boolean => useBrowserSource(onlineSource);

export const OfflineNotice = ({ recordDateLabel }: { recordDateLabel: string }) => {
  const online = useOnline();
  if (online) return null;

  return (
    <output
      aria-live="polite"
      className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100"
    >
      <span className="font-medium">You are offline.</span>
      <span>
        This is the reading recorded {recordDateLabel}, saved the last time this browser loaded the page.
        Reconnect to see whether the call has moved.
      </span>
    </output>
  );
};
