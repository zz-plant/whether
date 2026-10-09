"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RUNWAY_CHANGED_EVENT, type RunwayChangedDetail } from "./useOperatorRunway";

const isRunwayChangedDetail = (value: unknown): value is RunwayChangedDetail =>
  typeof value === "object"
  && value !== null
  && typeof Reflect.get(value, "bandChanged") === "boolean"
  && (Reflect.get(value, "source") === "pick" || Reflect.get(value, "source") === "figure");

/**
 * Re-renders the server's part of the page when the runway band moves.
 *
 * The server scales the rules it renders to the band in the runway cookie.
 * Both runway writers (`persistOperatorRunway` for a picked band,
 * `syncRunwayBandToFigures` for a typed figure) announce whether the band
 * changed; this is the one listener. A picked band re-renders at once; a band
 * implied by a typed figure waits (see `RunwayChangedDetail`).
 *
 * A `?runway=` in the address outranks the cookie on the server (links from
 * the embed and the exports carry one on purpose), so when the reader changes
 * their band here that parameter is dropped rather than left to overrule them.
 * Mounted once, with the global header.
 */
export function RunwayServerSync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const onChange = (event: Event) => {
      const detail: unknown = event instanceof CustomEvent ? event.detail : undefined;
      // A typed figure has already written the cookie; the server catches up
      // the next time its part of the page is shown (a navigation, or the
      // next reload), not mid-keystroke.
      if (!isRunwayChangedDetail(detail) || !detail.bandChanged) return;

      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (detail.source === "figure") {
        // Out of the address without a navigation, so a reload reads the
        // cookie the reader just set instead of the link they arrived on.
        if (params.has("runway")) {
          params.delete("runway");
          const query = params.toString();
          window.history.replaceState(window.history.state, "", `${pathname}${query ? `?${query}` : ""}${window.location.hash}`);
        }
        return;
      }
      if (params.has("runway")) {
        params.delete("runway");
        const query = params.toString();
        router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
        return;
      }
      router.refresh();
    };
    window.addEventListener(RUNWAY_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(RUNWAY_CHANGED_EVENT, onChange);
  }, [router, pathname, searchParams]);

  return null;
}
