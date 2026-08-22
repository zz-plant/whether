import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RegimeAlertsPanel } from "../app/components/regimeAlertsPanel";

const APP_DIR = new URL("../app/", import.meta.url).pathname.replace(/\/$/, "");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

/** Comments first: a directive below a doc comment is still a directive, and an endpoint
 *  named in prose is still not a call. Both halves of the guard read past them. */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const isClientComponent = (source: string) =>
  /^\s*("use client"|'use client')/.test(stripComments(source).trimStart());

/** Matches a call with the path written inline. A fetch built from a variable would slip
 *  past, which is the limit of a source scan. */
const callsAlertDeliveries = (source: string) =>
  /fetch\(\s*[`"'][^`"']*\/api\/alert-deliveries/.test(stripComments(source));

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
    // A mention is not a call: this panel's own comment names the endpoint it stopped
    // using, and matching prose would fail the guard on the explanation of the fix.
    assert.ok(callsAlertDeliveries('fetch("/api/alert-deliveries", { method: "POST" })'));
    assert.ok(callsAlertDeliveries("fetch(`/api/alert-deliveries?clientId=${id}`)"));
    assert.ok(!callsAlertDeliveries("// POSTed /api/alert-deliveries and reported a send"));

    const clientComponents = sourceFiles(APP_DIR)
      .filter((file) => !file.includes("/api/"))
      .filter((file) => isClientComponent(readFileSync(file, "utf8")));

    // Anchoring the directive at index 0 skipped every file that opens with a doc comment —
    // 10 of them, this panel included, so the guard passed while inspecting nothing that
    // mattered. Assert the coverage it claims before trusting the result.
    assert.ok(
      clientComponents.some((file) => file.endsWith("app/components/regimeAlertsPanel.tsx")),
      "the panel this guard exists for is among the files it scans",
    );

    const callers = clientComponents
      .filter((file) => callsAlertDeliveries(readFileSync(file, "utf8")))
      .map((file) => file.replace(`${APP_DIR}/`, "app/"));

    assert.deepEqual(callers, []);
  });
});
