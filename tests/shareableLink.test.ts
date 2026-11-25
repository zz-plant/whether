import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { shareablePageLink } from "../lib/navigation/shareableLink";

describe("the link Copy page link hands out", () => {
  it("leaves the reader's hypotheticals and views behind and keeps the open area", () => {
    assert.equal(
      shareablePageLink("https://whether.work/?decision=hiring&reading=cut-2&compare=2022-09&trail=since-2012#what-would-change"),
      "https://whether.work/?decision=hiring#what-would-change",
    );
    assert.equal(shareablePageLink("https://whether.work/trust?rate=3.85"), "https://whether.work/trust");
    assert.equal(shareablePageLink("https://whether.work/?counted=1&rule=roadmap"), "https://whether.work/?rule=roadmap");
  });

  it("keeps what names the page itself", () => {
    assert.equal(shareablePageLink("https://whether.work/?month=9&year=2022"), "https://whether.work/?month=9&year=2022");
    assert.equal(shareablePageLink("https://whether.work/operate"), "https://whether.work/operate");
  });
});
