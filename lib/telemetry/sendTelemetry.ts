import { STORAGE_KEYS } from "../storage/keys";

/**
 * How a browser sends a measurement, and the one place it can be told not to.
 *
 * Each emitter (activation, route moves, web vitals, search, content) carried
 * its own copy of the beacon-then-fetch send. That was harmless until there was
 * a reason to stop sending: on 2026-09-30 the homepage's 85 arrival-tagged
 * visits were 81 returning browsers reloading the page and four first visits,
 * so the owner's own checks were most of what the funnel counted. An opt-out
 * honoured in every emitter is an opt-out the next emitter forgets.
 *
 * The opt-out is a key in this browser's storage. Nothing is sent to say it was
 * set, and `/privacy` section 5 is where a reader sets or clears it.
 */
const MEASUREMENT_OFF = "1";

export const isMeasurementOff = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.measurementOff) === MEASUREMENT_OFF;
  } catch {
    // No window (server render) or blocked storage: nothing was turned off.
    return false;
  }
};

export const setMeasurementOff = (off: boolean) => {
  try {
    if (off) {
      window.localStorage.setItem(STORAGE_KEYS.measurementOff, MEASUREMENT_OFF);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.measurementOff);
    }
  } catch {
    // Blocked storage cannot hold the choice; the control re-reads and shows what stuck.
  }
};

export const sendTelemetry = (endpoint: string, payload: unknown) => {
  if (isMeasurementOff()) return;

  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    if (navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }))) return;
  }

  void fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
    priority: "low",
  }).catch(() => {
    // Telemetry never surfaces in the page or its console.
  });
};
