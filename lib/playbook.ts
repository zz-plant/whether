/**
 * Playbook selectors for mapping regimes to operational stop/start/fence guidance.
 * Keeps playbook copy centralized and traceable to the insight database.
 */
import { insightDatabase } from "../data/recommendations";
import type { RegimeKey } from "./regimeEngine";

export interface PlaybookEntry {
  key: RegimeKey;
  title: string;
  tone: string;
  mandate: string;
  insight: string;
  stop: string[];
  start: string[];
  metric: string;
}

export const getPlaybookForRegime = (regime: RegimeKey): PlaybookEntry | null => {
  const match = insightDatabase.regimePlaybooks.regimes.find((entry) => entry.key === regime);
  if (!match) {
    return null;
  }

  return {
    key: match.key,
    title: match.title,
    tone: match.tone,
    mandate: match.mandate,
    insight: match.insight,
    stop: match.stop,
    start: match.start,
    metric: match.metric,
  };
};
