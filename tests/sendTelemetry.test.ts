import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { describe, it } from "bun:test";
import { isMeasurementOff, sendTelemetry, setMeasurementOff } from "../lib/telemetry/sendTelemetry";
import { STORAGE_KEYS } from "../lib/storage/keys";

/**
 * One send path for every browser measurement, and the opt-out `/privacy`
 * section 5 offers. The opt-out is only as good as the claim that nothing sends
 * around it, so the last test reads the source for a second beacon.
 */

const fakeStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
};

const withBrowser = async (run: (sent: string[]) => Promise<void> | void) => {
  const originalWindow = Reflect.get(globalThis, "window");
  const originalNavigator = globalThis.navigator;
  const originalFetch = globalThis.fetch;
  const sent: string[] = [];

  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: fakeStorage() } });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      sendBeacon: (endpoint: string) => {
        sent.push(endpoint);
        return true;
      },
    },
  });
  globalThis.fetch = async () => {
    sent.push("fetch");
    return new Response(null, { status: 204 });
  };

  try {
    await run(sent);
  } finally {
    // Put back absent rather than present-and-undefined, for suites that ask `"window" in globalThis`.
    if (originalWindow === undefined) Reflect.deleteProperty(globalThis, "window");
    else Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: originalNavigator });
    globalThis.fetch = originalFetch;
  }
};

describe("sendTelemetry", () => {
  it("sends by beacon when this browser has not turned measurement off", async () => {
    await withBrowser((sent) => {
      sendTelemetry("/api/telemetry/activation", { step: "visited", path: "/" });
      assert.deepEqual(sent, ["/api/telemetry/activation"]);
    });
  });

  it("sends nothing at all once this browser turns measurement off", async () => {
    await withBrowser(async (sent) => {
      setMeasurementOff(true);
      assert.equal(isMeasurementOff(), true);
      assert.equal(window.localStorage.getItem(STORAGE_KEYS.measurementOff), "1");

      sendTelemetry("/api/telemetry/activation", { step: "visited", path: "/" });
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.deepEqual(sent, [], "an opted-out browser sent a measurement");
    });
  });

  it("sends again once the choice is reversed, and leaves no key behind", async () => {
    await withBrowser((sent) => {
      setMeasurementOff(true);
      setMeasurementOff(false);
      assert.equal(isMeasurementOff(), false);
      assert.equal(window.localStorage.getItem(STORAGE_KEYS.measurementOff), null);

      sendTelemetry("/api/telemetry/web-vitals", { name: "LCP" });
      assert.deepEqual(sent, ["/api/telemetry/web-vitals"]);
    });
  });

  it("reads as measuring where there is no browser storage to ask", () => {
    assert.equal(isMeasurementOff(), false);
  });

  it("is the only place in app/ or lib/ that queues a beacon", () => {
    const sources = ["app", "lib"].flatMap((dir) =>
      readdirSync(dir, { recursive: true, encoding: "utf8" })
        .filter((file) => /\.tsx?$/.test(file))
        .map((file) => `${dir}/${file}`));
    const senders = sources.filter((file) => readFileSync(file, "utf8").includes("navigator.sendBeacon("));
    assert.deepEqual(senders, ["lib/telemetry/sendTelemetry.ts"], "a measurement that skips sendTelemetry skips the opt-out too");
  });
});
