/**
 * Centralized Client Storage Keys
 * Single source of truth for localStorage and sessionStorage keys.
 *
 * Every entry here has a reader and a writer. The registry used to list five
 * keys nothing touched — including `whether_stage`, while the code that
 * actually persisted stage wrote a cookie under a different name — which is
 * how a "single source of truth" stops being one.
 */
import { OPERATOR_PROFILE_STORAGE_KEY } from "../operatorProfile";

export const STORAGE_KEYS = {
  theme: "whether-theme",
  displayMode: "whether-display-mode",
  homeOrientationDismissed: "whether.home.orientation.dismissed",
  reviewedRecordDates: "whether_reviewed",
  operatorProfile: OPERATOR_PROFILE_STORAGE_KEY,
  operatorWorkflowLastPath: "whether.operatorWorkflow.lastPath",
  decisionMemory: (clientId: string) => `whether.decisionMemory:${clientId}`,
  decisionShieldPresets: (clientId?: string | null) =>
    clientId ? `whether.decisionShieldPresets:${clientId}` : "whether.decisionShieldPresets",
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;
