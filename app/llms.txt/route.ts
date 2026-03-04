import { resolveSiteUrl } from "../../lib/siteUrl";

export { edgeRuntime as runtime } from "../../lib/next-runtime";
export const revalidate = 3600;

export async function GET() {
  const baseUrl = resolveSiteUrl();

  const content = [
    "# Whether (whether.work) — Agent Interface",
    "",
    "Whether turns public macro signals into operating guidance for product and engineering leaders.",
    "",
    "## Primary machine endpoint",
    `- GET ${baseUrl}/api/agent?cadence=<weekly|monthly|quarterly|yearly>`,
    "- Default cadence: weekly",
    "- Response: JSON summary, provenance, agent handoff payload + prompt, generatedAt, version, discovery links",
    "- Invalid cadence behavior: HTTP 400 with allowedCadences",
    "",
    "## Guidance",
    "- Start with cadence=weekly unless you need longer-horizon planning context.",
    "- Preserve provenance/source metadata in downstream outputs.",
    "",
    "## Docs",
    `- Discovery manifest: ${baseUrl}/.well-known/whether-agent.json`,
    `- Agent endpoint: ${baseUrl}/api/agent`,
    "- Agent docs in repository: docs/agents/agent-interface.md",
  ].join("\n");

  return new Response(content, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
