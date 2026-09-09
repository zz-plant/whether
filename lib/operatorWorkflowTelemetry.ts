export type OperatorWorkflowRoute = "/" | "/signals" | "/operate" | "/resolve";

/**
 * One event, because one is what the client sends.
 *
 * This union also carried `assist_panel_opened` and `artifact_mode_selected`,
 * typed against a `literacyAssist` module that was nothing but a table of
 * storage keys: no control set an assist focus or an artifact mode, nothing
 * read five of the six keys, and `trackOperatorWorkflowEvent` has exactly one
 * caller — the route tracker below-left, which emits `route_transition`. A
 * validator that accepts events no emitter produces reads as coverage of a
 * feature that does not exist.
 */
export type OperatorWorkflowEvent = {
  type: "route_transition";
  path: string;
  fromPath: OperatorWorkflowRoute;
  toPath: OperatorWorkflowRoute;
};

export const OPERATOR_WORKFLOW_TELEMETRY_ENDPOINT = "/api/telemetry/operator-workflow";
export const operatorWorkflowRouteStorageKey = "whether.operatorWorkflow.lastPath";

export const isOperatorWorkflowRoute = (value: string): value is OperatorWorkflowRoute =>
  value === "/" || value === "/signals" || value === "/operate" || value === "/resolve";

export const isOperatorWorkflowEvent = (input: unknown): input is OperatorWorkflowEvent => {
  if (!input || typeof input !== "object") {
    return false;
  }

  const payload = input as Record<string, unknown>;

  if (typeof payload.path !== "string" || payload.path.length === 0) {
    return false;
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
