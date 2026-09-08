/**
 * Centralized Client Storage Keys
 * Single source of truth for localStorage and sessionStorage keys.
 *
 * Every entry here has a reader and a writer. The registry used to list five
 * keys nothing touched — including `whether_stage`, while the code that
 * actually persisted stage wrote a cookie under a different name — which is
 * how a "single source of truth" stops being one. `displayMode` went the same
 * way on 2026-09-07: it had both, and no stylesheet that read what they wrote.
 */
import { OPERATOR_PROFILE_STORAGE_KEY } from "../operatorProfile";

export const STORAGE_KEYS = {
  theme: "whether-theme",
  homeOrientationDismissed: "whether.home.orientation.dismissed",
  reviewedRecordDates: "whether_reviewed",
  /* Successor to `reviewedRecordDates`, which stored `{ reviewed: boolean }` per
   * week. A separate key rather than a migration: the old value carries no part
   * of the closeout record, so reading it would only invent one. */
  weeklyCloseouts: "whether.weeklyCloseouts",
  operatorProfile: OPERATOR_PROFILE_STORAGE_KEY,
  operatorWorkflowLastPath: "whether.operatorWorkflow.lastPath",
  decisionMemory: (clientId: string) => `whether.decisionMemory:${clientId}`,
  decisionShieldPresets: (clientId?: string | null) =>
    clientId ? `whether.decisionShieldPresets:${clientId}` : "whether.decisionShieldPresets",
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;
