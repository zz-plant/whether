"use client";

import { parseBriefArtifact, type BriefArtifact } from "../../lib/report/briefArtifact";
import { BRIEF_ARTIFACT_ELEMENT_ID } from "./briefArtifactScript";
import { createBrowserSource, useBrowserSource } from "./browserSource";

/*
 * The published brief island, or null on a route that carries no call.
 *
 * Read after hydration rather than during render: the panel is a client
 * component that can mount before or after the island depending on the route,
 * so reading the DOM during render would make the result depend on that
 * ordering. That used to be a `setState` in a mount effect; as a store it is
 * the same timing with React owning the second render.
 *
 * The parse has to be cached, not just the read. `parseBriefArtifact` allocates,
 * and `getSnapshot` runs on every render — returning a fresh object each time is
 * the one way this conversion could spin. `tests/browserSource.test.ts` pins that.
 */
const briefArtifactSource = createBrowserSource<BriefArtifact | null>({
  read: () => {
    const element = document.getElementById(BRIEF_ARTIFACT_ELEMENT_ID);
    if (!element?.textContent) return null;
    // A malformed or half-written island is a bug on the producing route. The
    // panel falls back to its generic share text rather than copying a brief
    // with holes in it.
    return parseBriefArtifact(element.textContent);
  },
  serverValue: null,
  // The island belongs to the route, not the tab: a panel mounting on the next
  // route must not be handed the previous one's brief out of the cache.
  refreshOnSubscribe: true,
});

export function useBriefArtifact(): BriefArtifact | null {
  return useBrowserSource(briefArtifactSource);
}
