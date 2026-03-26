import assert from "node:assert/strict";
import { describe, it } from "node:test";
// @ts-expect-error next config is JavaScript module
import nextConfig from "../next.config.js";

describe("next.config redirects", () => {
  it("redirects retired startup-macro-posture and solutions routes to canonical surfaces", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];
    type RedirectEntry = { source: string; destination: string; permanent: boolean };
    const hasRedirect = (predicate: (entry: RedirectEntry) => boolean) =>
      redirects.some((entry: RedirectEntry) => predicate(entry));

    assert.ok(hasRedirect((entry) => entry.source === "/startup-macro-posture/index" && entry.destination === "/method#formula-reference" && entry.permanent));
    assert.ok(hasRedirect((entry) => entry.source === "/startup-macro-posture/:regime" && entry.destination === "/posture/:regime" && entry.permanent));
    assert.ok(hasRedirect((entry) => entry.source === "/startup-macro-posture" && entry.destination === "/posture" && entry.permanent));

    assert.ok(hasRedirect((entry) => entry.source === "/solutions/engineering-capacity" && entry.destination === "/toolkits/ops-capacity" && entry.permanent));
    assert.ok(hasRedirect((entry) => entry.source === "/solutions/product-roadmapping" && entry.destination === "/toolkits/focus" && entry.permanent));
    assert.ok(hasRedirect((entry) => entry.source === "/solutions/market-regime-playbook" && entry.destination === "/decide/ops-risk" && entry.permanent));
    assert.ok(hasRedirect((entry) => entry.source === "/solutions/career-paths" && entry.destination === "/decide/product" && entry.permanent));
    assert.ok(hasRedirect((entry) => entry.source === "/solutions/:path*" && entry.destination === "/decide" && entry.permanent));
  });
});
