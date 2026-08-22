/**
 * Centralized Client Storage Keys
 * Single source of truth for localStorage and sessionStorage keys.
 */

export const STORAGE_KEYS = {
  theme: "whether-theme",
  displayMode: "whether-display-mode",
  homeOrientationDismissed: "whether.home.orientation.dismissed",
  reviewedRecordDates: "whether_reviewed",
  decisionHistory: "whether_decision_history",
  commandCenterVisited: "whether_command_center_visited",
  companyStage: "whether_stage",
  rateSensitivity: "whether_sensitivity",
  displayPreference: "whether_display",
  operatorWorkflowLastPath: "whether.operatorWorkflow.lastPath",
  decisionMemory: (clientId: string) => `whether.decisionMemory:${clientId}`,
  decisionShieldPresets: (clientId?: string | null) =>
    clientId ? `whether.decisionShieldPresets:${clientId}` : "whether.decisionShieldPresets",
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;
