import assert from "node:assert/strict";
import { describe, it } from "node:test";
// @ts-expect-error next config is JavaScript module
import nextConfig from "../next.config.js";

describe("next.config redirects", () => {
  it("redirects retired operations routes to canonical developer docs", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];

    assert.deepEqual(redirects, [
      {
        source: "/operations/data",
        destination:
          "https://github.com/zz-plant/whether/blob/main/docs/developer/operations-reference.md#weekly-dataapi-handoff",
        permanent: true,
      },
      {
        source: "/operations/cli",
        destination:
          "https://github.com/zz-plant/whether/blob/main/docs/developer/operations-reference.md#cli-handoff",
        permanent: true,
      },
      {
        source: "/operations/integrations",
        destination:
          "https://github.com/zz-plant/whether/blob/main/docs/developer/operations-reference.md#integrations-handoff",
        permanent: true,
      },
    ]);
  });
});
