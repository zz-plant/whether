"use client";

import { useEffect, useState } from "react";
import { TimeMachineDatePicker } from "./timeMachineDatePicker";

/**
 * The one mount for the month picker, opened by event.
 *
 * The time machine is the most capable thing on the site — it re-renders the whole
 * brief as it read in any covered month — and its only entry point was a button
 * labelled "Browse past months", inside a sheet opened by a history icon labelled
 * "Export", which the picker itself was nested inside. Nothing in the command palette,
 * the keyboard map, or the page pointed at it.
 *
 * Same shape as `GlobalCommandPalette`: mounted once in the layout, opened by a
 * document event, so any surface can offer the feature without owning a copy of it.
 */
export const OPEN_TIME_MACHINE_EVENT = "whether-open-time-machine";

export function GlobalTimeMachine() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handle = () => setOpen(true);
    document.addEventListener(OPEN_TIME_MACHINE_EVENT, handle);
    return () => document.removeEventListener(OPEN_TIME_MACHINE_EVENT, handle);
  }, []);

  if (!open) return null;

  return <TimeMachineDatePicker onClose={() => setOpen(false)} />;
}

export const openTimeMachine = () => {
  document.dispatchEvent(new CustomEvent(OPEN_TIME_MACHINE_EVENT));
};
