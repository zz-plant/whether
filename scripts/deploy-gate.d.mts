/** Whether `env` (default `process.env`) marks this run as inside the deploy gate. */
export function isDeployGate(env?: Record<string, string | undefined>): boolean;

/** `env` (default `process.env`) with the deploy-gate signal set. */
export function withDeployGate(env?: Record<string, string | undefined>): Record<string, string | undefined>;
