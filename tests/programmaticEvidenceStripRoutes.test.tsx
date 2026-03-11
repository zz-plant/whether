import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import DecideClusterPage, { generateStaticParams as decideStaticParams } from "../app/decide/[slug]/[cluster]/page";
import SignalDecisionScenarioPage, { generateStaticParams as signalStaticParams } from "../app/signals/[cluster]/[decision-scenario]/page";
import ToolkitClusterPage, { generateStaticParams as toolkitStaticParams } from "../app/toolkits/[slug]/[cluster]/page";

describe("programmatic evidence strip placement", () => {
  it("renders evidence strip on /signals programmatic templates", async () => {
    const firstSignalRoute = signalStaticParams()[0];
    const html = renderToStaticMarkup(
      await SignalDecisionScenarioPage({ params: Promise.resolve(firstSignalRoute) }),
    );

    assert.match(html, /Decision contract/);
    assert.match(html, /Evidence and trust/);
    assert.match(html, /Top sources/);
  });

  it("renders evidence strip on /decide programmatic templates", async () => {
    const firstDecideRoute = decideStaticParams()[0];
    const html = renderToStaticMarkup(
      await DecideClusterPage({ params: Promise.resolve(firstDecideRoute) }),
    );

    assert.match(html, /Decision contract/);
    assert.match(html, /Evidence and trust/);
    assert.match(html, /Top sources/);
  });

  it("renders evidence strip on /toolkits programmatic templates", async () => {
    const firstToolkitRoute = toolkitStaticParams()[0];
    const html = renderToStaticMarkup(
      await ToolkitClusterPage({ params: Promise.resolve(firstToolkitRoute) }),
    );

    assert.match(html, /Decision contract/);
    assert.match(html, /Evidence and trust/);
    assert.match(html, /Top sources/);
  });
});
