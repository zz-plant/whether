"use client";

import { useEffect, useState } from "react";
import { parseBriefArtifact, type BriefArtifact } from "../../lib/report/briefArtifact";
import { BRIEF_ARTIFACT_ELEMENT_ID } from "./briefArtifactScript";

/**
 * Reads the published brief island, or null on a route that carries no call.
 *
 * Read in an effect rather than during render: the panel is a client component
 * that can mount before or after the island depending on the route, and reading
 * the DOM during render would make the result depend on that ordering.
 */
export function useBriefArtifact(): BriefArtifact | null {
  const [artifact, setArtifact] = useState<BriefArtifact | null>(null);

  useEffect(() => {
    const element = document.getElementById(BRIEF_ARTIFACT_ELEMENT_ID);
    if (!element?.textContent) return;
    // A malformed or half-written island is a bug on the producing route. The
    // panel falls back to its generic share text rather than copying a brief
    // with holes in it.
    setArtifact(parseBriefArtifact(element.textContent));
  }, []);

  return artifact;
}
