import { resolveSiteUrl } from "../../lib/siteUrl";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  const baseUrl = resolveSiteUrl();

  const content = [
    "# Whether — Agent Interface",
    "",
    "Whether turns public macro signals into a weekly operating posture for startup and product leaders.",
    "",
    "## Machine-readable endpoints",
    "",
    "### Markdown brief (recommended for browser/reading agents)",
    `- GET ${baseUrl}/brief.md`,
    "- Returns: Structured Markdown with posture, decisions, revisit triggers, provenance, and copy-paste-ready operator brief",
    "- Content-Type: text/markdown; charset=utf-8",
    "- Cache: 900s",
    "",
    "### JSON agent API",
    `- GET ${baseUrl}/api/agent?cadence=<weekly|monthly|quarterly|yearly>`,
    "- Default cadence: weekly",
    "- Response: JSON with summary, posture, decision delta, flip watch, agent handoff payload + prompt, provenance",
    "- Invalid cadence: HTTP 400 with allowedCadences",
    "",
    "## Guidance for agents",
    "- Prefer /brief.md for reading and summarization tasks — it's Markdown, structured, and instant",
    "- Use /api/agent for structured data processing, integration, or when you need specific cadence windows",
    "- The homepage (/) includes JSON-LD structured data (schema.org/Report) with decision artifacts",
    "- All endpoints include provenance metadata — preserve it in downstream outputs",
    "",
    "## Discovery",
    `- Manifest: ${baseUrl}/.well-known/whether-agent.json`,
    `- Homepage: ${baseUrl}/`,
    `- Brief (Markdown): ${baseUrl}/brief.md`,
    `- Agent API: ${baseUrl}/api/agent`,
  ].join("\n");

  return new Response(content, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
