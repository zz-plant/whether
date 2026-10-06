import { AGENT_START_TOOL } from "../agent/discovery";

/**
 * Who the Whether MCP server says it is, the same on every transport.
 *
 * The remote server (`/api/mcp`) and the local one (`bun run mcp:whether`) each carried their
 * own name, version and instructions, and had drifted apart: two names, five tools against
 * twelve. A client configured against one learned nothing true about the other.
 */

/**
 * What /api/mcp and the local stdio server can negotiate. Since the HTTP transport
 * moved onto the SDK (2026-10), this mirrors its SUPPORTED_PROTOCOL_VERSIONS minus
 * the legacy 2024 revisions, which are accepted by the transport but not advertised.
 */
export const MCP_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"] as const;

export const MCP_SERVER_INFO = {
  name: "whether",
  title: "Whether — Weekly Operating Brief",
  version: "1.1.0",
} as const;

/* Read by the client at initialize and usually placed in the model's context, so it says
   where to start and what to check before acting, and leaves the per-tool detail to the
   tool descriptions. It names tools by hand, as prose grouped by use; get_signals,
   get_analog_playbook and list_agent_skills are left to tools/list on purpose.
   `tests/agentDiscoveryParity.test.ts` fails on a name the registry does not serve, and on a
   tool added to the registry until it is named here or left out on purpose there. */
export const MCP_SERVER_INSTRUCTIONS =
  "Whether turns public macro data into weekly operating guidance for startup leaders. " +
  `Call ${AGENT_START_TOOL} first: one small answer with the conditions, the confidence, whether the data is live and current ` +
  "(automation.ready; when it is false, say so and stop), where each score sits against its pause, resume and change lines, " +
  "what moved each score, and the guidance. " +
  "get_brief is the full weekly brief (about 22KB), for its wording, provenance and the other cadences. " +
  "get_decision_rules gives the bounded rules behind the guidance. " +
  "get_context and get_projection place today's conditions in history and estimate how soon they change; both default to today's reading. " +
  "get_recent_history gives one signal's trailing window, get_comps the SaaS valuation multiples, and " +
  "stress_test_plan, lint_commitment and lint_sprint_goal check a plan against today's conditions. " +
  "Informational only: not investment, legal, tax or employment advice.";
