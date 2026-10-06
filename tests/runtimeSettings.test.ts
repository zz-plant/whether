import assert from "node:assert/strict";
import { afterEach, describe, it } from "bun:test";
import { readSetting } from "../lib/runtime/settings";

const NAME = "WHETHER_TEST_ONLY_SETTING";

afterEach(() => {
  Reflect.deleteProperty(globalThis, NAME);
  delete process.env[NAME];
});

describe("readSetting", () => {
  it("prefers the Worker binding over the environment", () => {
    Reflect.set(globalThis, NAME, "from-binding");
    process.env[NAME] = "from-env";
    assert.equal(readSetting(NAME), "from-binding");
  });

  it("falls back to the environment, and answers null when neither is set", () => {
    process.env[NAME] = "from-env";
    assert.equal(readSetting(NAME), "from-env");
    delete process.env[NAME];
    assert.equal(readSetting(NAME), null);
  });

  it("trims by default, and an all-space value is unset", () => {
    Reflect.set(globalThis, NAME, "  key\n");
    assert.equal(readSetting(NAME), "key");
    Reflect.set(globalThis, NAME, "   ");
    assert.equal(readSetting(NAME), null);
  });

  it("reads a signing secret byte for byte when asked not to trim", () => {
    Reflect.set(globalThis, NAME, " secret ");
    assert.equal(readSetting(NAME, { trim: false }), " secret ");
  });

  /* Three of the eight hand-written readers let an empty binding shadow the environment.
     Pinned so the one rule is visible: empty is unset, at either source. */
  it("treats an empty binding as unset and reads the environment", () => {
    Reflect.set(globalThis, NAME, "");
    process.env[NAME] = "from-env";
    assert.equal(readSetting(NAME), "from-env");
    assert.equal(readSetting(NAME, { trim: false }), "from-env");
  });

  it("ignores a binding that is not a string", () => {
    Reflect.set(globalThis, NAME, { not: "a string" });
    assert.equal(readSetting(NAME), null);
  });
});
