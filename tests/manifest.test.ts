import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import manifest from "../app/manifest";

describe("web app manifest", () => {
  it("describes Whether as an installable weekly-brief app", () => {
    const value = manifest();

    assert.equal(value.name, "Whether");
    assert.equal(value.short_name, "Whether");
    assert.equal(value.display, "standalone");
    assert.equal(value.start_url, "/");
    assert.equal(value.scope, "/");
    assert.equal(value.theme_color, "#0f1316");
    assert.equal(value.background_color, "#0f1316");
    assert.ok(value.shortcuts?.some((shortcut) => shortcut.url === "/operate"));
    assert.ok(value.shortcuts?.some((shortcut) => shortcut.url === "/signals"));
    assert.ok(value.icons?.some((icon) => icon.src === "/icon-192.png" && icon.sizes === "192x192"));
    assert.ok(value.icons?.some((icon) => icon.src === "/icon-512.png" && icon.sizes === "512x512"));
    assert.ok(value.icons?.some((icon) => icon.src === "/icon.svg"));
  });
});
