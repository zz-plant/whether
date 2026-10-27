import assert from "node:assert/strict";
import { describe, it } from "bun:test";
import { buildAssistantLinks, buildAssistantPrompt } from "../lib/export/askAssistant";

/* The prompt names the dated record, so the assistant reads the week the reader was looking at. */
describe("ask an assistant", () => {
  const url = "https://whether.work/brief/2026-w43";
  const prompt = buildAssistantPrompt(url, "Oct 19, 2026");

  it("names the brief's address and week, and asks for the reader's numbers rather than guessing", () => {
    assert.ok(prompt.includes(`week of Oct 19, 2026: ${url}`));
    assert.match(prompt, /ask me for my company's stage, monthly burn, and months of runway/);
  });

  it("prefills each assistant with the same prompt", () => {
    const links = buildAssistantLinks(url, "Oct 19, 2026");
    assert.deepEqual(links.map((link) => link.name), ["Claude", "ChatGPT", "Perplexity"]);
    for (const link of links) assert.equal(new URL(link.href).searchParams.get("q"), prompt);
  });
});
