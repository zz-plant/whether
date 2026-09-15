"use client";

import { useEffect, useState } from "react";
import { ShareRail } from "./shareRail";

/**
 * The one way to open the share rail.
 *
 * `GlobalShareRail` is mounted once, from `app/layout.tsx`, so the rail opens at
 * the top of the tree wherever it is asked for. The profile sheet used to mount
 * a second `ShareRail` inside its own dialog instead: an overlay rendered from
 * within another overlay, which left the sheet sitting behind it and returned
 * the reader to the sheet rather than the page on close. Dispatch this and let
 * the global instance own it, the way the command palette does.
 */
const OPEN_SHARE_RAIL_EVENT = "whether-open-share-rail";

export const openShareRail = () => {
  document.dispatchEvent(new CustomEvent(OPEN_SHARE_RAIL_EVENT));
};

export function GlobalShareRail() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handle = () => setOpen(true);
    document.addEventListener(OPEN_SHARE_RAIL_EVENT, handle);
    return () => document.removeEventListener(OPEN_SHARE_RAIL_EVENT, handle);
  }, []);

  if (!open) return null;

  return <ShareRail onClose={() => setOpen(false)} />;
}
