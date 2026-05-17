import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GlobalHeaderNavClient } from "../app/components/globalHeaderNavClient";

describe("GlobalHeaderNavClient", () => {
  it("renders workflow step links", () => {
    const html = renderToStaticMarkup(
      <GlobalHeaderNavClient pathname="/" />,
    );
    assert.ok(html.length > 0, "renders without error");
  });
});
