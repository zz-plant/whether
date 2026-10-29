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
