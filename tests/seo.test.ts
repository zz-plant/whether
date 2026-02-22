import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { serializeJsonLd } from "../lib/seo";

describe("JSON-LD serialization", () => {
  it("escapes script-breaking and HTML-sensitive characters", () => {
    const payload = {
      description: "</script><script>alert('xss')</script>",
      text: "A & B > C",
      separators: "\u2028\u2029",
    };

    const serialized = serializeJsonLd(payload);

    assert.match(serialized, /\\u003c\/script\\u003e\\u003cscript\\u003ealert\('xss'\)\\u003c\/script\\u003e/);
    assert.ok(!serialized.includes("</script>"));
    assert.ok(serialized.includes("\\u0026"));
    assert.ok(serialized.includes("\\u003e"));
    assert.ok(serialized.includes("\\u2028"));
    assert.ok(serialized.includes("\\u2029"));
  });
});
