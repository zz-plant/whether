/**
 * Official TypeScript SDK Client for Whether.
 * Programmatic interface for calling Whether's macro briefs, decision stress-testing,
 * PRD commitment linting, and analog playbooks.
 */
import type {
  PlanStressTestRequest,
  PlanStressTestResult,
} from "../decisionShield";
import type { AnalogPlaybookResult } from "../analogPlaybook";

interface WhetherClientConfig {
  baseUrl?: string;
  apiKey?: string;
  fetchFn?: typeof fetch;
}

export class WhetherClient {
  private baseUrl: string;
  private apiKey?: string;
  private fetcher: typeof fetch;

  constructor(config: WhetherClientConfig = {}) {
    this.baseUrl = (config.baseUrl ?? "https://whether.work").replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.fetcher = config.fetchFn ?? fetch;
  }

  private async callMcpTool<T>(toolName: string, args: Record<string, unknown>): Promise<T> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (this.apiKey) {
      headers["authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await this.fetcher(`${this.baseUrl}/api/mcp`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: toolName,
          arguments: args,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Whether API error: HTTP ${response.status}`);
    }

    const payload = (await response.json()) as any;
    if (payload.error) {
      throw new Error(`Whether MCP Error: ${payload.error.message}`);
    }

    return (payload.result.structuredContent ?? JSON.parse(payload.result.content[0].text)) as T;
  }

  /** Retrieve the current macro operating brief */
  async getBrief(cadence: "weekly" | "monthly" | "quarterly" = "weekly") {
    return this.callMcpTool("get_brief", { cadence });
  }

  /** Stress-test an operational decision or plan against live macro conditions */
  async stressTestPlan(request: PlanStressTestRequest): Promise<PlanStressTestResult> {
    return this.callMcpTool<PlanStressTestResult>("stress_test_plan", {
      planText: request.planText,
      lifecycle: request.lifecycle,
      companyProfile: request.companyProfile,
    });
  }

  /** Lint an engineering PRD, RFC, or procurement spec for capital lock-in */
  async lintCommitment(specText: string): Promise<PlanStressTestResult> {
    return this.callMcpTool<PlanStressTestResult>("lint_commitment", { specText });
  }

  /** Retrieve the closest historical analog cycle and consensus trap */
  async getAnalogPlaybook(): Promise<AnalogPlaybookResult> {
    return this.callMcpTool<AnalogPlaybookResult>("get_analog_playbook", {});
  }
}
