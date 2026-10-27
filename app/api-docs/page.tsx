import { Fragment } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { PageShell } from "../components/pageShell";
import { WHETHER_AGENT_MANIFEST_PATH } from "../../lib/agent/discovery";
import { describeAgentTools } from "../../lib/agent/tools";
import { siteUrl } from "../../lib/siteUrl";
import { buildApiDocsStructuredData } from "../../lib/seo/pageStructuredData";
import { buildPageMetadata } from "../../lib/seo";
import { SAAS_BASKET } from "../../lib/saasMultiples";

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
  tryAriaLabel?: string;
};

function Endpoint({ signature, children, tryHref, tryLabel, tryAriaLabel }: EndpointProps) {
  return (
    <div className="weather-surface px-4 py-3 space-y-1">
      <code className="block text-fluid-xs font-semibold text-slate-100">{signature}</code>
      <p className="text-xs text-slate-300">{children}</p>
      {tryHref ? (
        <a
          href={tryHref}
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

/*
 * One click from this page to a connected client. Each editor publishes an
 * install link that opens it with the server filled in and asks the reader to
 * confirm; Claude Code takes one command. The config is the same address the
 * JSON above names, so a reader who prefers to paste loses nothing.
 */
const mcpUrl = `${siteUrl}/api/mcp`;
const cursorInstallHref = `cursor://anysphere.cursor-deeplink/mcp/install?${new URLSearchParams({
  name: "whether",
  config: btoa(JSON.stringify({ url: mcpUrl })),
}).toString()}`;
const vscodeInstallHref = `vscode:mcp/install?${encodeURIComponent(JSON.stringify({ name: "whether", type: "http", url: mcpUrl }))}`;
const claudeCodeCommand = `claude mcp add --transport http whether ${mcpUrl}`;

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
          scores behind it, and the pause and resume lines through a Model Context Protocol (MCP) server, REST endpoints, a CLI, and an embeddable widget. Whether is free, and the API needs no key.
        </p>

        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="type-eyebrow">Connect Claude, Cursor & AI Agents (MCP)</h2>
            <span className="text-fluid-micro font-mono text-emerald-400">Streamable HTTP • No auth required</span>
          </div>
          <p className="text-xs text-slate-300">
            <span className="font-semibold text-slate-100">{siteUrl}/api/mcp</span> is a production-grade
            streamable-HTTP Model Context Protocol server. Connect Claude Desktop, Cursor, Copilot, or an autonomous agent, and the model can read this week's guidance, each score's distance from its line, and a scenario's result while it reasons.
          </p>
          <div className="flex flex-wrap items-center gap-2" aria-label="Install the MCP server">
            <a href={cursorInstallHref} className="weather-button inline-flex items-center text-fluid-xs">
              Add to Cursor
            </a>
            <a href={vscodeInstallHref} className="weather-button inline-flex items-center text-fluid-xs">
              Add to VS Code
            </a>
          </div>
          <div className="space-y-1.5">
            <p className="text-fluid-micro text-slate-400">Claude Code:</p>
            <pre className="overflow-x-auto rounded-lg border border-[color:var(--border-subtle)] bg-[var(--bg-nested)] p-3 text-fluid-xs leading-relaxed text-slate-300">
              {claudeCodeCommand}
            </pre>
            <p className="text-fluid-micro text-slate-400">
              Claude or ChatGPT on the web: add a custom connector with the address above.
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-fluid-micro text-slate-400">
              <span>Claude Code, one line from any directory:</span>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-[color:var(--border-subtle)] bg-[var(--bg-nested)] p-3 text-fluid-xs leading-relaxed text-slate-300">
              claude mcp add --transport http whether {siteUrl}/api/mcp
            </pre>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-fluid-micro text-slate-400">
              <span>Claude Desktop (<code className="font-mono text-slate-300">claude_desktop_config.json</code>) or Cursor Settings → MCP:</span>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-[color:var(--border-subtle)] bg-[var(--bg-nested)] p-3 text-fluid-xs leading-relaxed text-slate-300">
              {mcpClientConfig}
            </pre>
          </div>
          <p className="text-xs text-slate-300">
            Start with <span className="font-mono text-slate-100">get_state</span>: one small answer with the conditions and the margin from their change lines, the data's freshness, each score against its lines with the moves behind it, and the guidance. Every tool only reads:{" "}
            {toolNames.map((name, index) => (
              <Fragment key={name}>
                {index > 0 ? ", " : ""}
                <span className="font-mono text-slate-100">{name}</span>
              </Fragment>
            ))}
            . For local agents or CI pipelines, <span className="font-mono text-slate-100">bun run mcp:whether</span>{" "}
            starts the same tools over stdio.
          </p>
          <p className="text-xs text-slate-300">
            A weather word works wherever a tool takes conditions: Freezing, Cloudy, Stormy or Sunny, in any case. A
            wrong argument is refused with the values that would have worked.
          </p>
          <p className="text-xs text-slate-300">
            An agent that reads URLs can start at{" "}
            <Link href="/llms.txt" className="text-sky-200 underline decoration-sky-600 underline-offset-2">
              /llms.txt
            </Link>
            : it lists every answer page against the question it answers and states how current the reading is.
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
            >
              Discovery. Lists every available tool with its parameters.
            </Endpoint>
            <Endpoint signature="GET /api/mcp?tool=get_state">
              The compact state to decide from: the answer <code className="font-mono">/api/agent?view=state</code> gives.
            </Endpoint>
            <Endpoint signature="GET /api/mcp?tool=get_brief">
              A summary: current conditions, action, margin (the <code className="font-mono">confidence</code> field), record date. Optional weekly, monthly, quarterly or
              yearly view. The MCP tool of the same name returns the full brief.
            </Endpoint>
            <Endpoint signature="GET /api/mcp?tool=get_context&amp;regime=DEFENSIVE">
              How long these conditions have held, how long they have lasted on average, and what usually comes next. With no
              conditions given it uses today&apos;s.
            </Endpoint>
            <Endpoint signature="GET /api/mcp?tool=get_projection&amp;regime=DEFENSIVE&amp;tightness=74&amp;riskAppetite=32">
              Weeks until a score crosses its change line at a pace you give, or, with no arguments, at today&apos;s scores and pace.
              Scenario modeling for agents.
            </Endpoint>
            <Endpoint signature="GET /api/mcp?tool=get_comps">
              Median SaaS EV/Revenue multiple across {SAAS_BASKET.length} public companies.
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
              signature={`GET ${WHETHER_AGENT_MANIFEST_PATH}`}
              tryHref={WHETHER_AGENT_MANIFEST_PATH}
              tryLabel="Try it"
            >
              Discovery manifest. Where an agent starts, the agent endpoints and MCP tools, the
              supported cadences, and the revisable-delegation conformance level with the
              third-party verifier that can check it. Start here if you are wiring up an agent.
            </Endpoint>
            <Endpoint
              signature="GET /api/posture/current"
              tryHref="/api/posture/current"
              tryLabel="Try it"
            >
              Stable JSON endpoint for the current guidance. Returns the conditions, funding pressure, direction,
              margin (<code className="font-mono">confidence</code>), week, summary, url, and version. Type contract at lib/types.ts.
            </Endpoint>
            <Endpoint
              signature="GET /api/agent?view=state"
              tryHref="/api/agent?view=state"
              tryLabel="Try it"
            >
              The state to decide from, about a tenth the size of the full brief: the conditions and the margin from their change lines, the data's freshness (<code className="font-mono">automation.ready</code>), each score against its pause, resume and change lines with the moves behind it, and the guidance. Weekly only. Check{" "}
              <code className="font-mono">automation.ready</code> before acting without a person looking.
            </Endpoint>
            <Endpoint
              signature="GET /api/agent?cadence=weekly"
              tryHref="/api/agent?cadence=weekly"
              tryLabel="Try it"
            >
              The full structured brief, with the block an agent hands on. Supports weekly, monthly, quarterly,
              yearly.
            </Endpoint>
            <Endpoint
              signature="GET /api/agent?week=2026-w41"
              tryHref="/api/agent?week=2026-w41"
              tryLabel="Try it"
            >
              One published week, unchanged since it went out, with its permalink. A week not on the record
              answers 404 and lists the weeks that are.
            </Endpoint>
            <Endpoint
              signature="GET /api/agent?period=2024-q1"
              tryHref="/api/agent?period=2024-q1"
              tryLabel="Try it"
            >
              A past quarter or year from the archive (<code className="font-mono">2024-q1</code>,{" "}
              <code className="font-mono">2023</code>), with its permalink. A period not in the archive answers
              404 and lists the ones that are.
            </Endpoint>
            <Endpoint
              signature="GET /api/agent?format=jev"
              tryHref="/api/agent?format=jev"
              tryLabel="Try it"
            >
              This week&apos;s guidance as a ready-to-send request for TypeSafe&apos;s Jev decision model
              (<code className="font-mono">typesafe/jev</code> on Cloudflare Workers AI). Put a short
              description of your plan in <code className="font-mono">request.state.plan</code> and send
              the request yourself. Jev answers whether the plan goes against the guidance, which decision it
              touches, how hard it is to undo, and whether it is safer after conditions change. Whether
              never sees the plan. Check <code className="font-mono">automationReady</code> before you
              act on an answer: it is false when this week&apos;s reading is not live or not current.
            </Endpoint>
            <Endpoint
              signature="GET /api/decision"
              tryHref="/api/decision"
              tryLabel="Try it"
            >
              This week&apos;s guidance in one JSON object: the action, each area&apos;s action with its pause
              and resume lines, the decisions to revisit, and the lines that would change the guidance.
            </Endpoint>
            <Endpoint
              signature="GET /api/scores"
              tryHref="/api/scores"
              tryLabel="Try it"
            >
              The two headline numbers on their own: funding pressure, risk appetite, both deltas, the
              distance to the line where conditions change, and the score that would cross first.
            </Endpoint>
            <Endpoint
              signature="GET /api/cadence"
              tryHref="/api/cadence"
              tryLabel="Try it"
            >
              Weekly and monthly summaries side by side, with an alignment status naming any
              constraints where the two cadences disagree.
            </Endpoint>
            <Endpoint
              signature="GET /api/comps"
              tryHref="/api/comps"
              tryLabel="Try it"
            >
              SaaS valuation multiples, with the source that answered. Returns 503 when no market
              data source answers, rather than an empty basket.
            </Endpoint>
            <Endpoint
              signature="GET /api/regime-alerts"
              tryHref="/api/regime-alerts"
              tryLabel="Try it"
            >
              Paginated history of alerts sent when conditions changed. Read access is open; only the Monday run writes.
            </Endpoint>
            <Endpoint
              signature="GET /api/integrations/weekly-mandate?target=slack|notion|linear"
              tryHref="/api/integrations/weekly-mandate?target=slack"
              tryLabel="Try it"
            >
              This week&apos;s guidance shaped for one tool: Slack blocks (the default), a Notion page, or a
              Linear issue. The Slack channel and the Notion database it names are placeholders; set your
              own before you send it.
            </Endpoint>
            <Endpoint signature="GET /api/decision-memory?format=records|csv">
              Past guidance in NDJSON, shaped by the Revisable Delegation record schema — one
              belief record per week of published guidance. <code className="font-mono">format=csv</code> returns
              the same entries as a spreadsheet. Scoped to the caller: it reads your own decision
              memory, so it needs an <span className="font-mono text-slate-100">x-whether-client-id</span> header
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
            >
              The week&apos;s guidance preformatted for Slack — action, pause line, resume line.
              Post it to a channel without reformatting.
            </Endpoint>
            <Endpoint
              signature="GET /api/image/brief?layout=landscape|square|portrait&theme=light"
              tryHref="/api/image/brief"
              tryLabel="View image"
              tryAriaLabel="View the brief as an image"
            >
              The brief as a PNG card for decks and threads, 1200×800 by default.{" "}
              <code className="font-mono">layout</code> draws it <code className="font-mono">landscape</code>{" "}
              (1200×675), <code className="font-mono">square</code> (1080×1080) or{" "}
              <code className="font-mono">portrait</code> (1080×1350), and <code className="font-mono">theme=light</code> draws it on a light ground.{" "}
              <code className="font-mono">month=3&amp;year=2024</code> draws that month-end&apos;s reading, and{" "}
              <code className="font-mono">stage</code> (<code className="font-mono">seed</code>,{" "}
              <code className="font-mono">series-a</code>, <code className="font-mono">series-b</code> or{" "}
              <code className="font-mono">bootstrapped</code>) calibrates the action to a company stage.{" "}
              <code className="font-mono">ticker</code> and <code className="font-mono">sector</code> add a label
              and leave the reading unchanged.
            </Endpoint>
            <Endpoint signature="GET /api/image/brief-screenshot?date=YYYY-MM-DD|latest">
              The screenshot of the homepage&apos;s guidance taken each Monday, as a PNG.{" "}
              <code className="font-mono">date</code> is a reading&apos;s date, and{" "}
              <code className="font-mono">latest</code>, the default, is the newest. Each is kept about two
              months; a date with none stored answers 404.
            </Endpoint>
            <Endpoint
              signature="GET /api/badge"
              tryHref="/api/badge"
              tryLabel="View badge"
              tryAriaLabel="View this week's conditions as a badge"
            >
              This week&apos;s conditions as an SVG badge for a README, a data room or an investor page, in the
              conditions&apos; color. It says so when the reading is a saved copy.
            </Endpoint>
            <Endpoint
              signature="GET /api/image/slide?stage=seed"
              tryHref="/api/image/slide?stage=seed"
              tryLabel="View slide"
              tryAriaLabel="View the brief as a meeting slide"
            >
              The guidance as a widescreen meeting slide — hand-written SVG, so it stays sharp at projector
              size and the labels are still editable text in Figma or Keynote. Accepts seed,
              series-a, series-b, or growth.
            </Endpoint>
            <Endpoint
              signature="GET /api/export/board-slide?format=pptx|pdf&stage=seed&week=2026-w41"
              tryHref="/api/export/board-slide?format=pptx&stage=seed"
              tryLabel="Download PPTX"
              tryAriaLabel="Download the board slide as a PowerPoint file"
            >
              The same slide as a file: a one-slide native PPTX with every box editable, or a
              one-page widescreen PDF for a pre-read. Served as an attachment. Takes the same stage
              values as the SVG. With `week`, the slide is the frozen brief as published — no
              stage, and a brief from before scores were stored prints no scores.
            </Endpoint>
            <Endpoint
              signature="GET /api/embed?format=html|text|json|page&mode=call-strip"
              tryHref="/api/embed?format=text"
              tryLabel="Try it"
            >
              The brief as a snippet a newsletter build step can insert at send time: ready-to-paste HTML (the
              default), plain text, JSON, or <code className="font-mono">page</code>, a whole document for an
              iframe. <code className="font-mono">mode=call-strip</code> shortens it to one line.{" "}
              <code className="font-mono">stage</code> and <code className="font-mono">runway</code> (a band:{" "}
              <code className="font-mono">critical</code>, <code className="font-mono">tight</code>,{" "}
              <code className="font-mono">balanced</code> or <code className="font-mono">abundant</code>; or a
              number of months) calibrate the guidance to one company, and{" "}
              <code className="font-mono">ticker</code> names it.
            </Endpoint>
            <Endpoint
              signature="GET /brief.md"
              tryHref="/brief.md"
              tryLabel="View brief.md"
              tryAriaLabel="View Markdown brief"
            >
              The current brief in Markdown format. Instant, structured, cacheable.
            </Endpoint>
            <Endpoint
              signature="GET /llms.txt"
              tryHref="/llms.txt"
              tryLabel="View llms.txt"
              tryAriaLabel="View LLMs discovery document"
            >
              Agent discovery document. Linked from &lt;link rel=&quot;llm&quot;&gt; in the page head.
            </Endpoint>
            <Endpoint
              signature="GET /llms-full.txt"
              tryHref="/llms-full.txt"
              tryLabel="View llms-full.txt"
              tryAriaLabel="View the answer pages, guides and terms as one Markdown file"
            >
              The answer pages, guides and terms in one Markdown file, for a model that reads the site&apos;s
              text in one fetch.
            </Endpoint>
            <Endpoint
              signature="GET /feed.xml"
              tryHref="/feed.xml"
              tryLabel="View feed.xml"
              tryAriaLabel="View RSS feed"
            >
              RSS feed for the weekly brief. Subscribe in any RSS reader.
            </Endpoint>
            <Endpoint
              signature="GET /calendar.ics"
              tryHref="/calendar.ics"
              tryLabel="View calendar.ics"
              tryAriaLabel="View the calendar feed"
            >
              The same weeks as a calendar to subscribe to: each Monday of the last six months is an all-day
              event with that week&apos;s conditions and guidance. Subscribe by URL in any calendar app.
            </Endpoint>
          </div>
          <div className="weather-surface px-4 py-3 space-y-2">
            <p className="text-fluid-xs font-semibold text-slate-100">Embeddable widget</p>
            <p className="text-xs text-slate-300">
              Drop the current guidance into an internal dashboard or wiki. It updates itself each week.
              Add <span className="font-mono text-slate-100">data-whether-ticker</span> or{" "}
              <span className="font-mono text-slate-100">data-whether-stage</span> to tailor it to one company.
            </p>
            <pre className="overflow-x-auto rounded-lg border border-[color:var(--border-subtle)] bg-[var(--bg-nested)] p-3 text-fluid-xs leading-relaxed text-slate-300">
              {embedSnippet}
            </pre>
            <Link
              href="/share#embed"
              className="inline-flex text-fluid-micro text-sky-200 underline decoration-sky-600"
            >
              Configure it with a live preview →
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="type-eyebrow">Command line</h2>
          <p className="text-xs text-slate-300">
            The CLI&apos;s commands read public endpoints, so a script can make the same requests without it:
          </p>
          <pre className="overflow-x-auto rounded-lg border border-[color:var(--border-subtle)] bg-[var(--bg-nested)] p-3 text-fluid-xs leading-relaxed text-slate-300">
            curl {siteUrl}/api/cli/status
          </pre>
          <div className="space-y-3">
            <Endpoint
              signature="GET /api/cli/status?asOf=2026-03&view=expanded"
              tryHref="/api/cli/status"
              tryLabel="Try it"
            >
              What <code className="font-mono">whether status</code> reads. <code className="font-mono">asOf</code>{" "}
              reads a past month; <code className="font-mono">view=expanded</code> adds what would change the
              guidance and the signals that moved.
            </Endpoint>
            <Endpoint
              signature="GET /api/cli/history?asOf=2026-03&weeks=26"
              tryHref="/api/cli/history"
              tryLabel="Try it"
            >
              One row per month-end, newest first, going back <code className="font-mono">weeks</code> weeks (at
              most 52, the default). Each row carries that month-end&apos;s own margin and trend.
            </Endpoint>
            <Endpoint
              signature="GET /api/cli/scenario?tightness=74&risk-appetite=32"
              tryHref="/api/cli/scenario?tightness=74&risk-appetite=32"
              tryLabel="Try it"
            >
              What <code className="font-mono">whether scenario</code> reads: the conditions the scores you give
              would read as, against this week&apos;s. Either score may be left out.
            </Endpoint>
            <Endpoint signature="GET /api/cli/changes | call | regime | diagnostics">
              What <code className="font-mono">whether changes</code>, <code className="font-mono">call</code>,{" "}
              <code className="font-mono">regime</code> and <code className="font-mono">diagnostics</code> print,
              in JSON. Each takes <code className="font-mono">asOf</code>.
            </Endpoint>
          </div>
          <p className="text-xs text-slate-300">
            The <code className="font-mono text-slate-100">whether</code> CLI ships with the Whether source, and{" "}
            <code className="font-mono text-slate-100">--api-base-url {siteUrl}</code> makes it read this site
            rather than a local server.
          </p>
          <div className="space-y-3">
            <Endpoint signature="whether status">
              This week&apos;s guidance and the numbers behind it. Add{" "}
              <span className="font-mono text-slate-100">--as-of 2026-03</span> to read any past month.
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
            Also available: <span className="font-mono text-slate-100">diagnostics</span>,{" "}
            <span className="font-mono text-slate-100">history compare</span>,{" "}
            <span className="font-mono text-slate-100">company</span>,{" "}
            <span className="font-mono text-slate-100">share</span>,{" "}
            <span className="font-mono text-slate-100">doctor</span>, and shell completions.
          </p>
        </section>

        <p className="text-fluid-micro text-slate-400">
          All endpoints listed here are free and need no key or account. Data is provided for
          informational purposes.
        </p>
      </article>
    </PageShell>
  );
}
