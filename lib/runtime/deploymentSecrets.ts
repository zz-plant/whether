/**
 * Every secret the Worker reads, which lane needs it, and what stops without it.
 *
 * Until 2026-11-25 this list lived only as a table in docs/cloudflare-deployment-runbook.md, and
 * nothing compared it with the Worker. Production then held one secret of the eleven, and both
 * data Workflows failed on every run from 2026-11-02 for want of `GITHUB_TOKEN`, while the
 * failure notice that should have said so waited on `WHETHER_OPS_EMAIL`, also unset, and
 * `/api/health` answered "ok". Two readers now share this list: `/api/health` names the required
 * secrets a running lane is missing, and `bun run secrets:check` compares it with
 * `wrangler secret list` before anyone has to notice.
 *
 * A secret is required by the switch it serves, not by the lane's name. Production is not a
 * setting the Worker can read, but its switches are: a lane with the `EMAIL` binding runs the
 * scheduled sends and so needs somewhere to report their failures; a lane that starts a data
 * Workflow needs the token that Workflow opens its pull request with. A Worker Preview has
 * neither switch, so it needs none of these, which is what Cloudflare gives it.
 */

/** What a lane is switched to do: its plain-text settings and which bindings it has. */
export type LaneSwitches = {
  setting: (name: string) => string | null;
  hasBinding: (name: string) => boolean;
};

type DeploymentSecret = {
  name: string;
  /** True where the lane cannot do what it is switched on to do without this secret. */
  requiredOn: (lane: LaneSwitches) => boolean;
  /** One line for the operator: what is lost while it is unset. */
  withoutIt: string;
};

const never = () => false;

/** The cron's own condition for starting each data Workflow (worker/index.ts). */
const startsADataWorkflow = (lane: LaneSwitches) =>
  (lane.setting("WHETHER_HISTORY_WORKFLOW") === "1" && lane.hasBinding("REGIME_HISTORY_WORKFLOW"))
  || (lane.setting("WHETHER_BRIEF_FREEZE_WORKFLOW") === "1" && lane.hasBinding("BRIEF_FREEZE_WORKFLOW"));

export const DEPLOYMENT_SECRETS: readonly DeploymentSecret[] = [
  {
    name: "GITHUB_TOKEN",
    requiredOn: startsADataWorkflow,
    withoutIt: "Both data Workflows fail at their first step: no week is frozen and the regime archive is not rebuilt.",
  },
  {
    name: "WHETHER_OPS_EMAIL",
    requiredOn: (lane) => lane.hasBinding("EMAIL"),
    withoutIt: "A failed scheduled step or Workflow is recorded and reaches nobody.",
  },
  {
    name: "WHETHER_CRON_SECRET",
    requiredOn: never,
    withoutIt: "The manual cron endpoints answer 503 cron_secret_not_configured.",
  },
  {
    name: "FRED_API_KEY",
    requiredOn: never,
    withoutIt: "FRED reads stay on the chart-export CSV, and a vintage (asOf) read throws.",
  },
  {
    name: "ALPHA_VANTAGE_API_KEY",
    requiredOn: never,
    withoutIt: "SaaS comps price from Cboe's delayed quotes, falling back to Yahoo Finance.",
  },
  {
    name: "SLACK_SIGNING_SECRET",
    requiredOn: never,
    withoutIt: "Production answers every interactive Slack action with 503.",
  },
  {
    name: "SLACK_WEBHOOK_URL",
    requiredOn: never,
    withoutIt: "The operator's own channel gets no brief or alert; subscribed channels still do.",
  },
  {
    name: "CLOUDFLARE_ACCOUNT_ID",
    requiredOn: never,
    withoutIt: "/trust shows no scheduled runs and the Slack brief carries no screenshot.",
  },
  {
    name: "CLOUDFLARE_ANALYTICS_READ_TOKEN",
    requiredOn: never,
    withoutIt: "/trust renders no Scheduled runs section.",
  },
  {
    name: "CLOUDFLARE_BROWSER_RENDERING_TOKEN",
    requiredOn: never,
    withoutIt: "The Monday Slack brief goes out as text, without the rendered call.",
  },
  {
    name: "INDEXNOW_KEY",
    requiredOn: never,
    withoutIt: "New pages are not pushed to IndexNow search engines.",
  },
];

/** The required secrets this lane does not hold, in list order. Names only: never a value. */
export const missingRequiredSecrets = (lane: LaneSwitches, isSet: (name: string) => boolean): string[] =>
  DEPLOYMENT_SECRETS.filter((secret) => secret.requiredOn(lane) && !isSet(secret.name)).map((secret) => secret.name);

type ConfigBinding = { type: string; value?: unknown };

/**
 * A lane's switches as `cloudflare.config.ts` declares them, for a reader that has the config
 * rather than a running Worker: `bun run secrets:check`, and the test that holds production to
 * needing what the runbook says it needs.
 */
export const laneFromConfigEnv = (env: Record<string, ConfigBinding>): LaneSwitches => ({
  setting: (name) => {
    const binding = env[name];
    return binding?.type === "text" && typeof binding.value === "string" ? binding.value : null;
  },
  hasBinding: (name) => {
    const binding = env[name];
    return binding !== undefined && binding.type !== "text";
  },
});
