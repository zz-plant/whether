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
  /* The per-browser identifier every owned record is scoped by. It had a reader
     and a writer in `app/components/clientIdentity.ts` and was not in this
     registry, so the one key the privacy census most needs to see was the one
     it could not: /privacy 2.2 describes it, and nothing failed if that stopped
     being true. */
  clientId: "whether-client-id",
  homeOrientationDismissed: "whether.home.orientation.dismissed",
  reviewedRecordDates: "whether_reviewed",
  operatorProfile: OPERATOR_PROFILE_STORAGE_KEY,
  operatorWorkflowLastPath: "whether.operatorWorkflow.lastPath",
  /** The call this browser last saw — written on every visit, read on the next. */
  lastSeenCall: "whether.lastSeenCall",
  /** Set from `/privacy` section 5; `lib/telemetry/sendTelemetry.ts` sends nothing while it holds "1". */
  measurementOff: "whether.measurement.off",
  /* How many decisions this browser last knew its record to hold, beside the id the
     record is keyed by (`app/components/decisionLedgerClient.ts`). The record itself
     is server-side; this is only what lets the homepage skip asking about it when the
     answer has always been none. */
  decisionMemory: (clientId: string) => `whether.decisionMemory:${clientId}`,
  decisionShieldPresets: (clientId?: string | null) =>
    clientId ? `whether.decisionShieldPresets:${clientId}` : "whether.decisionShieldPresets",
} as const;
