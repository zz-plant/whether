import type { ArtifactMode, LiteracyAssistMode } from "./literacyAssist";

export type OperatorWorkflowRoute = "/" | "/signals" | "/operate" | "/answer";
export type AssistPanelOpenSource = "click" | "query" | "stored_preference";

export type OperatorWorkflowEvent =
  | {
      type: "assist_panel_opened";
      path: string;
      assistMode: LiteracyAssistMode;
      source: AssistPanelOpenSource;
    }
  | {
      type: "artifact_mode_selected";
      path: string;
      artifactMode: ArtifactMode;
    }
  | {
      type: "route_transition";
      path: string;
      fromPath: OperatorWorkflowRoute;
      toPath: OperatorWorkflowRoute;
    };

export const OPERATOR_WORKFLOW_TELEMETRY_ENDPOINT = "/api/telemetry/operator-workflow";
export const operatorWorkflowRouteStorageKey = "whether.operatorWorkflow.lastPath";

export const isOperatorWorkflowRoute = (value: string): value is OperatorWorkflowRoute =>
  value === "/" || value === "/signals" || value === "/operate" || value === "/answer";

export const isOperatorWorkflowEvent = (input: unknown): input is OperatorWorkflowEvent => {
  if (!input || typeof input !== "object") {
    return false;
  }

  const payload = input as Record<string, unknown>;

  if (typeof payload.path !== "string" || payload.path.length === 0) {
    return false;
  }

  if (payload.type === "assist_panel_opened") {
    return (
      (payload.assistMode === "decision" ||
        payload.assistMode === "evidence" ||
        payload.assistMode === "trust" ||
        payload.assistMode === "share") &&
      (payload.source === "click" ||
        payload.source === "query" ||
        payload.source === "stored_preference")
    );
  }

  if (payload.type === "artifact_mode_selected") {
    return payload.artifactMode === "operator" || payload.artifactMode === "explainer";
  }

  if (payload.type === "route_transition") {
    return (
      isOperatorWorkflowRoute(String(payload.fromPath)) &&
      isOperatorWorkflowRoute(String(payload.toPath))
    );
  }

  return false;
};

export const trackOperatorWorkflowEvent = (event: OperatorWorkflowEvent) => {
  const body = JSON.stringify(event);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const beaconBody = new Blob([body], { type: "application/json" });
    const queued = navigator.sendBeacon(OPERATOR_WORKFLOW_TELEMETRY_ENDPOINT, beaconBody);
    if (queued) {
      return;
    }
  }

  void fetch(OPERATOR_WORKFLOW_TELEMETRY_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
    priority: "low",
  }).catch(() => {
    // Ignore telemetry network failures to keep the client console clean.
  });
};
