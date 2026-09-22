import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { describe, it } from "bun:test";

/**
 * A control that reloads the document belongs at the layer the document is.
 *
 * `ManualRefreshButton` calls `window.location.reload()`. It was rendered by
 * `dataProvenanceStrip`, which mounts at eleven call sites, under the title
 * "Request a fresh snapshot for this provenance context" — so one `/operate` or
 * `/signals` view carried several pills that each read as scoped to the panel
 * containing them and each reloaded the whole page, discarding unsaved plan text
 * and planner inputs elsewhere on it.
 */

const APP_DIR = new URL("../app/", import.meta.url).pathname.replace(/\/$/, "");

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const relative = (file: string) => file.replace(`${APP_DIR}/`, "app/");

/** Where a whole-document reload is the honest scope: the page is the unit. */
const PAGE_LEVEL_HOSTS = ["app/components/liveDataFallbackAlert.tsx"];

describe("document-scoped controls stay at the document layer", () => {
  it("renders ManualRefreshButton only where the page is the unit", () => {
    const hosts = sourceFiles(APP_DIR)
      .filter((file) => !file.endsWith("app/components/manualRefreshButton.tsx"))
      .filter((file) => /<ManualRefreshButton\b/.test(stripComments(readFileSync(file, "utf8"))))
      .map(relative)
      .sort();

    assert.deepEqual(hosts, PAGE_LEVEL_HOSTS);
  });

  it("keeps the reload out of the provenance strip, which mounts many times per page", () => {
    const strip = stripComments(readFileSync(`${APP_DIR}/components/dataProvenanceStrip.tsx`, "utf8"));

    assert.doesNotMatch(strip, /ManualRefreshButton/);
    assert.doesNotMatch(strip, /location\.reload/);
  });

  it("claims no more than a reload in the control's own copy", () => {
    const button = readFileSync(`${APP_DIR}/components/manualRefreshButton.tsx`, "utf8");

    // "Request a fresh snapshot" was wrong twice: the scope was the document,
    // and a reload re-renders the same materialized model rather than fetching.
    assert.doesNotMatch(stripComments(button), /fresh snapshot|Updated just now/);
    // The success arm was unreachable — isRefreshing is set true and never cleared.
    assert.doesNotMatch(stripComments(button), /successLabel/);
  });
});

describe("overlays open from the layer that owns them", () => {
  it("mounts the command palette only from its global owner", () => {
    const hosts = sourceFiles(APP_DIR)
      .filter((file) => !file.endsWith("app/components/commandPalette.tsx"))
      .filter((file) => /<CommandPalette\b/.test(stripComments(readFileSync(file, "utf8"))))
      .map(relative)
      .sort();

    assert.deepEqual(hosts, ["app/components/globalCommandPalette.tsx"]);
  });

  it("mounts ShareRail once, from the global instance", () => {
    const hosts = sourceFiles(APP_DIR)
      .filter((file) => !file.endsWith("app/components/shareRail.tsx"))
      .filter((file) => /<ShareRail\b/.test(stripComments(readFileSync(file, "utf8"))))
      .map(relative)
      .sort();

    // The profile sheet used to render a second one inside its own dialog — an
    // overlay within an overlay, which left the sheet behind it and returned the
    // reader there on close instead of to the page.
    assert.deepEqual(hosts, ["app/components/globalShareRail.tsx"]);
  });

  it("keeps the presentation control out of the hero's artifact row", () => {
    const hero = stripComments(readFileSync(`${APP_DIR}/components/DecisionHero.tsx`, "utf8"));
    const header = stripComments(
      readFileSync(`${APP_DIR}/components/globalHeaderActionsClient.tsx`, "utf8"),
    );

    // Copy Brief, Copy Meeting Slide and Track in Memory act on the brief.
    // Present changes the page's display mode, so it belongs beside theme.
    assert.doesNotMatch(hero, /PresentModeButton/);
    assert.match(header, /PresentModeButton/);
    // Gated: focus mode targets [data-home-shell-main], which only Shell renders.
    assert.match(header, /showPresentMode/);
  });

  it("makes presentation mode present the brief rather than only restyle it", () => {
    const controller = stripComments(
      readFileSync(`${APP_DIR}/components/focusModeController.tsx`, "utf8"),
    );
    const frames = stripComments(readFileSync(`${APP_DIR}/components/presentationFrames.tsx`, "utf8"));

    // The mode was named "Presentation Focus Mode" while doing nothing but
    // swapping the main container's classes — a reading mode under a
    // presentation's name.
    assert.match(controller, /<PresentationFrames/);
    // Call, then what reopens, then what would flip it. The order is the point:
    // a meeting that sees the thresholds before the decisions re-litigates the
    // call instead of acting on it.
    assert.match(frames, /"The call", "Decisions to revisit", DECISION_CONTRACT_LABELS\.watch\.flipWatch/);
    // One artifact behind the frames and the copy formats, so the summary a
    // presenter pastes is the brief the room just saw.
    assert.match(frames, /useBriefArtifact/);
    assert.match(frames, /formatBriefArtifact/);
  });
});
