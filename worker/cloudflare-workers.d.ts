/**
 * Minimal ambient types for the `cloudflare:workers` module. The repo deliberately does not
 * install @cloudflare/workers-types (its globals collide with the DOM lib the app needs), so
 * the few runtime classes the Worker extends are declared here, narrowed to what the code
 * uses. Extend this file when a new Workers base class is adopted.
 */
declare module "cloudflare:workers" {
  export interface WorkflowEvent<Params> {
    payload: Params;
    timestamp: Date;
    instanceId: string;
  }

  export interface WorkflowStepConfig {
    retries?: {
      limit: number;
      delay: string | number;
      backoff?: "constant" | "linear" | "exponential";
    };
    timeout?: string | number;
  }

  export interface WorkflowStep {
    do<T>(name: string, callback: () => Promise<T>): Promise<T>;
    do<T>(name: string, config: WorkflowStepConfig, callback: () => Promise<T>): Promise<T>;
    sleep(name: string, duration: string | number): Promise<void>;
  }

  export abstract class WorkflowEntrypoint<Env = unknown, Params = unknown> {
    constructor(ctx: unknown, env: Env);
    protected readonly env: Env;
    abstract run(event: WorkflowEvent<Params>, step: WorkflowStep): Promise<unknown>;
  }
}
