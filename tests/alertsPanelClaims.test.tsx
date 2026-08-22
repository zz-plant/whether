import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RegimeAlertsPanel } from "../app/components/regimeAlertsPanel";

const APP_DIR = new URL("../app/", import.meta.url).pathname;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

describe("regime alerts panel", () => {
  it("says the channel choices are a preference, not a delivery", () => {
    const html = renderToStaticMarkup(<RegimeAlertsPanel />);

    assert.ok(html.includes("Alert history"), "renders the alert history panel");
    assert.match(html, /not live yet/, "discloses that push delivery is not running");
    assert.match(html, /nothing is sent from here/, "says plainly that the toggles send nothing");
  });

  // The control this replaced said "Deliver latest alert" and then reported "Delivered to N
  // channels" off a response that had only written log rows.
  it("makes no claim of having delivered anything", () => {
    const html = renderToStaticMarkup(<RegimeAlertsPanel />);

    assert.doesNotMatch(html, /Deliver latest alert/);
    assert.doesNotMatch(html, /Delivered to/);
  });

  // POST /api/alert-deliveries appends a delivery row with status "sent" for every enabled
  // channel without contacting a channel, so a browser surface calling it can only report a
  // send that did not happen.
  it("keeps client surfaces off the alert-deliveries write path", () => {
    const callers = sourceFiles(APP_DIR)
      .filter((file) => !file.includes("/api/"))
      .filter((file) => {
        const source = readFileSync(file, "utf8");
        return /^\s*("use client"|'use client')/.test(source) && source.includes("/api/alert-deliveries");
      })
      .map((file) => file.replace(APP_DIR, "app/"));

    assert.deepEqual(callers, []);
  });
});
