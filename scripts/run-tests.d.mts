/**
 * The runner's parsed shard summary: bun's `N pass / M fail / K skip` tail and its own
 * `Ran N tests across M files` line, which the runner adds up into one suite total —
 * a single shard's summary is that shard's, not the suite's.
 */
export function parseShardSummary(output: string): {
  pass: number;
  fail: number;
  skip: number;
  tests: number;
  files: number;
};

/** The shard count a run should use: one process when the caller names files or tests. */
export function resolveShardCount(args: string[], requestedShards: number): number;

/** The flag arguments a shard inherits, with each value flag's value attached. */
export function collectFlagArgs(args: string[]): string[];

/**
 * Whether a run hides the app's own console output: a run that covers the suite does,
 * unless it is the deploy gate or `WHETHER_TEST_LOGS=1` asks for the output.
 */
export function shouldQuietAppLogs(
  args: string[],
  env?: Record<string, string | undefined>,
  deployGate?: boolean,
): boolean;
