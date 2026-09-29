import { Fragment } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "../components/pageShell";
import { describeAgentTools } from "../../lib/agent/tools";
import { siteUrl } from "../../lib/siteUrl";
import { buildApiDocsStructuredData } from "../../lib/seo/pageStructuredData";
import { buildPageMetadata } from "../../lib/seo";

/* Through the shared builder, for the reason /share records: without its own
   `openGraph` this page previewed as the homepage when its link was shared. */
export const metadata: Metadata = {
  ...buildPageMetadata({
    title: "API & Agent Tools",
    description: "The weekly brief, the monthly record, SaaS multiples and the decision rules, programmatically: an MCP server, REST endpoints, a CLI and an embeddable widget.",
    path: "/api-docs",
    imageAlt: "Whether API and agent tools",
  }),
  robots: { index: true, follow: true },
};

type EndpointProps = {
  signature: string;
  children: React.ReactNode;
  tryHref?: string;
  tryLabel?: string;
  tryCta?: string;
  tryAriaLabel?: string;
};

function Endpoint({ signature, children, tryHref, tryLabel, tryCta, tryAriaLabel }: EndpointProps) {
  return (
    <div className="weather-surface px-4 py-3 space-y-1">
      <code className="block text-fluid-xs font-semibold text-sky-200">{signature}</code>
      <p className="text-xs text-slate-300">{children}</p>
      {tryHref ? (
        <a
          href={tryHref}
          data-premium-intent="api_access"
          data-premium-cta={tryCta}
          aria-label={tryAriaLabel}
          className="inline-flex text-fluid-micro text-sky-200 underline decoration-sky-600"
        >
          {tryLabel} →
        </a>
      ) : null}
    </div>
  );
}

const mcpClientConfig = `{
  "mcpServers": {
    "whether": {
      "url": "${siteUrl}/api/mcp"
    }
  }
}`;

const embedSnippet = `<div data-whether-embed="brief"></div>
<script async src="${siteUrl}/embed.js"></script>`;

export default function ApiDocsPage() {
  // Named from the definitions the servers run, so a tool cannot be served and missing from this page.
  const toolNames = describeAgentTools("http").map((tool) => tool.name);
  return (
    <PageShell backdropVariant="default" structuredData={buildApiDocsStructuredData()}>
      <article className="weather-panel space-y-6 px-5 max-sm:px-0 py-5 max-w-3xl">
        <h1 className="text-fluid-xl font-semibold text-slate-100">API and agent tools</h1>
        <p className="text-sm text-slate-300">
          Read this week's guidance from an AI agent, a script, or a dashboard. Whether serves the guidance, the two
          scores behind it, and the pause and resume lines through a Model Context Protocol (MCP) server, REST endpoints, a CLI, and an embeddable widget. Free forever, no API key required.
        </p>

        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="type-eyebrow">Connect Claude, Cursor & AI Agents (MCP)</h2>
            <span className="text-fluid-micro font-mono text-emerald-400">Streamable HTTP • No auth required</span>
          </div>
          <p className="text-xs text-slate-300">
            <span className="font-semibold text-slate-100">{siteUrl}/api/mcp</span> is a production-grade
            streamable-HTTP Model Context Protocol server. Connect Claude Desktop, Cursor, Copilot, or an autonomous agent, and the model can read this week's guidance, how far each score sits from its line, and what a scenario would produce, while it reasons.
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-fluid-micro text-slate-400">
              <span>Claude Desktop (<code className="font-mono text-slate-300">claude_desktop_config.json</code>) or Cursor Settings → MCP:</span>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-white/[0.10] bg-[var(--bg-nested)] p-3 text-fluid-xs leading-relaxed text-slate-300">
              {mcpClientConfig}
            </pre>
          </div>
          <p className="text-xs text-slate-300">
            Start with <span className="text-sky-200 font-mono">get_state</span>: one small answer with the
            conditions, how sure Whether is, whether the data is live and current, where each
            score sits against its lines, what moved it, and the guidance. Every tool only reads:{" "}
            {toolNames.map((name, index) => (
              <Fragment key={name}>
                {index > 0 ? ", " : ""}
                <span className="text-sky-200 font-mono">{name}</span>
              </Fragment>
            ))}
            . For local agents or CI pipelines, <span className="text-sky-200 font-mono">bun run mcp:whether</span>{" "}
            starts the same tools over stdio.
          </p>
          <p className="text-xs text-slate-300">
            A weather word works wherever a tool takes conditions: Freezing, Cloudy, Stormy or Sunny, in any case. A
            wrong argument is refused with the values that would have worked.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="type-eyebrow">MCP tools over plain HTTP</h2>
          <p className="text-xs text-slate-300">
            Every MCP tool also answers a plain GET, for agents without an MCP client.
          </p>
          <div className="space-y-3">
            <Endpoint
              signature="GET /api/mcp?tool=get_actions"
              tryHref="/api/mcp?tool=get_actions"
              tryLabel="Try it"
              tryCta="try_mcp_get_actions"
            >
              Discovery. Lists every available tool with its parameters.
            </Endpoint>
            <Endpoint signature="GET /api/mcp?tool=get_state">
              The compact state to decide from: the answer <code className="font-mono">/api/agent?view=state</code> gives.
            </Endpoint>
            <Endpoint signature="GET /api/mcp?tool=get_brief">
              A summary: current conditions, action, confidence, record date. Optional weekly, monthly, quarterly or
              yearly view. The MCP tool of the same name returns the full brief.
            </Endpoint>
            <Endpoint signature="GET /api/mcp?tool=get_context&amp;regime=DEFENSIVE">
              How long these conditions have held, the historical average, and what usually comes next. With no
              conditions given it uses today&apos;s.
            </Endpoint>
            <Endpoint signature="GET /api/mcp?tool=get_projection&amp;regime=DEFENSIVE&amp;tightness=74&amp;riskAppetite=32">
              Weeks until threshold crossing at a pace you give, or, with no arguments, at today&apos;s scores and pace.
              Scenario modeling for agents.
            </Endpoint>
            <Endpoint signature="GET /api/mcp?tool=get_comps">
              Median SaaS EV/Revenue multiple from 15 public companies.
            </Endpoint>
            <Endpoint signature="GET /api/mcp?tool=get_signals">
              Coverage map of which months have signal history available.
            </Endpoint>
          </div>
          <p className="text-xs text-slate-300">
            The rest (the rules behind the guidance, one signal&apos;s trailing history, plan checks) take the same
            form; <code className="font-mono">get_actions</code> lists each with its arguments and a call that works.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="type-eyebrow">For developers</h2>
          <div className="space-y-3">
            <Endpoint
              signature="GET /.well-known/whether-agent.json"
              tryHref="/.well-known/whether-agent.json"
              tryLabel="Try it"
              tryCta="try_agent_manifest"
            >
              Discovery manifest. Every endpoint on this page, the supported cadences, and the
              revisable-delegation conformance level with the third-party verifier that can check
              it. Start here if you are wiring up an agent.
            </Endpoint>
            <Endpoint
              signature="GET /api/posture/current"
              tryHref="/api/posture/current"
              tryLabel="Try it"
              tryCta="try_posture_current"
            >
              Stable JSON endpoint for the current guidance. Returns the conditions, funding pressure, direction,
              confidence, week, summary, url, and version. Type contract at lib/types.ts.
            </Endpoint>
            <Endpoint
              signature="GET /api/agent?view=state"
              tryHref="/api/agent?view=state"
              tryLabel="Try it"
              tryCta="try_agent_state"
            >
              The state to decide from, about a tenth the size of the full brief: the conditions, how sure, whether
              the data is live and current (<code className="font-mono">automation.ready</code>), each score against its
              pause, resume and change lines, what moved it, and the guidance. Weekly only. Check{" "}
              <code className="font-mono">automation.ready</code> before acting without a person looking.
            </Endpoint>
            <Endpoint
              signature="GET /api/agent?cadence=weekly"
              tryHref="/api/agent?cadence=weekly"
              tryLabel="Try it"
              tryCta="try_agent_brief"
            >
              The full structured brief, with the block an agent hands on. Supports weekly, monthly, quarterly,
              yearly.
            </Endpoint>
            <Endpoint
              signature="GET /api/agent?format=jev"
              tryHref="/api/agent?format=jev"
              tryLabel="Try it"
              tryCta="try_agent_jev"
            >
              This week&apos;s guidance as a ready-to-send request for TypeSafe&apos;s Jev decision model
              (<code className="font-mono">typesafe/jev</code> on Cloudflare Workers AI). Put a short
              description of your plan in <code className="font-mono">request.state.plan</code> and send
              the request yourself; Jev answers whether the plan goes against the guidance, which decision it
              touches, how hard it is to undo, and whether it is safer after conditions change. Whether
              never sees the plan. Check <code className="font-mono">automationReady</code> before you
              act on an answer: it is false when this week&apos;s reading is not live or not current.
            </Endpoint>
            <Endpoint
              signature="GET /api/scores"
              tryHref="/api/scores"
              tryLabel="Try it"
              tryCta="try_scores"
            >
              The two headline numbers on their own — funding pressure, risk appetite, both deltas, plus
              distance to the line where conditions change and which score would cross first.
            </Endpoint>
            <Endpoint
              signature="GET /api/cadence"
              tryHref="/api/cadence"
              tryLabel="Try it"
              tryCta="try_cadence"
            >
              Weekly and monthly summaries side by side, with an alignment status naming any
              constraints where the two cadences disagree.
            </Endpoint>
            <Endpoint
              signature="GET /api/comps"
              tryHref="/api/comps"
              tryLabel="Try it"
              tryCta="try_comps"
            >
              SaaS valuation multiples with the company set behind them. Returns 503 when the quote
              source is unreachable rather than an empty basket.
            </Endpoint>
            <Endpoint
              signature="GET /api/regime-alerts"
              tryHref="/api/regime-alerts"
              tryLabel="Try it"
              tryCta="try_regime_alerts"
            >
              Paginated history of alerts sent when conditions changed. Read access is open; only the Monday run writes.
            </Endpoint>
            <Endpoint signature="GET /api/decision-memory?format=records">
              Past guidance in NDJSON, shaped by the Revisable Delegation record schema — one
              belief record per week of published guidance. Scoped to the caller: it reads your own decision
              memory, so it needs an <span className="text-sky-200">x-whether-client-id</span> header
              and answers 401 without one. No &quot;Try it&quot; link for that reason.
            </Endpoint>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="type-eyebrow">Artifacts to paste and embed</h2>
          <div className="space-y-3">
            <Endpoint
              signature="GET /api/brief/slack"
              tryHref="/api/brief/slack"
              tryLabel="Try it"
              tryCta="try_brief_slack"
            >
              The week&apos;s guidance preformatted for Slack — action, threshold, reversal condition.
              Post it to a channel without reformatting.
            </Endpoint>
            <Endpoint
              signature="GET /api/image/brief"
              tryHref="/api/image/brief"
              tryLabel="View image"
              tryCta="try_image_brief"
              tryAriaLabel="View the brief as an image"
            >
              The brief as a 1200×800 PNG for decks and threads. Accepts view and company-context
              params.
            </Endpoint>
            <Endpoint
              signature="GET /api/image/slide?stage=seed"
              tryHref="/api/image/slide?stage=seed"
              tryLabel="View slide"
              tryCta="try_image_slide"
              tryAriaLabel="View the brief as a meeting slide"
            >
              The guidance as a widescreen meeting slide — hand-written SVG, so it stays sharp at projector
              size and the labels are still editable text in Figma or Keynote. Accepts seed,
              series-a, series-b, or growth.
            </Endpoint>
            <Endpoint
              signature="GET /api/export/board-slide?format=pptx|pdf&stage=seed"
              tryHref="/api/export/board-slide?format=pptx&stage=seed"
              tryLabel="Download PPTX"
              tryCta="try_export_board_slide"
              tryAriaLabel="Download the board slide as a PowerPoint file"
            >
              The same slide as a file: a one-slide native PPTX with every box editable, or a
              one-page widescreen PDF for a pre-read. Served as an attachment. Takes the same stage
              values as the SVG.
            </Endpoint>
            <Endpoint
              signature="GET /api/embed?format=text|json|html"
              tryHref="/api/embed?format=text"
              tryLabel="Try it"
              tryCta="try_embed_api"
            >
              The brief as a snippet a newsletter build step can insert at send time, in plain
              text, JSON, or ready-to-paste HTML. Takes ticker and stage, so the guidance is calibrated
              to one company rather than generic.
            </Endpoint>
            <Endpoint
              signature="GET /brief.md"
              tryHref="/brief.md"
              tryLabel="View brief.md"
              tryCta="view_brief_md"
              tryAriaLabel="View Markdown brief"
            >
              The current brief in Markdown format. Instant, structured, cacheable.
            </Endpoint>
            <Endpoint
              signature="GET /llms.txt"
              tryHref="/llms.txt"
              tryLabel="View llms.txt"
              tryCta="view_llms_txt"
              tryAriaLabel="View LLMs discovery document"
            >
              Agent discovery document. Linked from &lt;link rel=&quot;llm&quot;&gt; in the page head.
            </Endpoint>
            <Endpoint
              signature="GET /feed.xml"
              tryHref="/feed.xml"
              tryLabel="View feed.xml"
              tryCta="view_feed_xml"
              tryAriaLabel="View RSS feed"
            >
              RSS feed for the weekly brief. Subscribe in any RSS reader.
            </Endpoint>
          </div>
          <div className="weather-surface px-4 py-3 space-y-2">
            <p className="text-fluid-xs font-semibold text-sky-200">Embeddable widget</p>
            <p className="text-xs text-slate-300">
              Drop the current guidance into an internal dashboard or wiki. It updates itself each week.
              Add <span className="text-sky-200">data-whether-ticker</span> or{" "}
              <span className="text-sky-200">data-whether-stage</span> to tailor it to one company.
            </p>
            <pre className="overflow-x-auto rounded-lg border border-white/[0.10] bg-[var(--bg-nested)] p-3 text-fluid-xs leading-relaxed text-slate-300">
              {embedSnippet}
            </pre>
            <Link
              href="/share#embed"
              data-premium-intent="api_access"
              data-premium-cta="open_embed_builder"
              className="inline-flex text-fluid-micro text-sky-200 underline decoration-sky-600"
            >
              Configure it with a live preview →
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="type-eyebrow">Command line</h2>
          <p className="text-xs text-slate-300">
            The <span className="text-sky-200">whether</span> CLI is an operator terminal for the
            same data: conditions, the guidance, what changed, what would change it.
          </p>
          <div className="space-y-3">
            <Endpoint signature="whether status">
              This week&apos;s guidance and the numbers behind it. Add{" "}
              <span className="text-sky-200">--as-of 2026-03</span> to read any past month.
            </Endpoint>
            <Endpoint signature="whether state --json">
              The state an agent decides from, in JSON: the answer{" "}
              <code className="font-mono">/api/agent?view=state</code> gives.
            </Endpoint>
            <Endpoint signature="whether brief slack | exec | board | investor">
              The same week rewritten for a specific audience.
            </Endpoint>
            <Endpoint signature="whether export pdf --output brief.pdf">
              Export the brief to json, csv, markdown, pdf, or a full briefing pack.
            </Endpoint>
            <Endpoint signature="whether watch --interval 60 --changes-only">
              Poll for a change in the guidance and print only what changed.
            </Endpoint>
            <Endpoint signature="whether scenario --tightness 74 --risk-appetite 32">
              Model a hypothetical and see which guidance it produces.
            </Endpoint>
            <Endpoint signature="whether explain flip">
              What would have to move, and by how much, to change this week&apos;s guidance.
            </Endpoint>
          </div>
          <p className="text-xs text-slate-300">
            Also available: <span className="text-sky-200">diagnostics</span>,{" "}
            <span className="text-sky-200">history compare</span>,{" "}
            <span className="text-sky-200">company</span>,{" "}
            <span className="text-sky-200">share</span>,{" "}
            <span className="text-sky-200">doctor</span>, and shell completions.
          </p>
        </section>

        <p className="text-fluid-micro text-slate-400">
          All endpoints listed here are free and require no authentication. Data is provided for
          informational purposes.
        </p>
      </article>
    </PageShell>
  );
}
