export type CheckTask = { name: string; script: string };

/** Every task a preset runs, across its stages, in run order. Throws on an unknown preset. */
export function presetTasks(name: string): string[];

/**
 * What a `run-checks.mjs` invocation runs: stages of tasks (each stage only after the
 * previous one passed), whether to fail fast within a stage, and whether the run is
 * the deploy gate. Throws on an unknown task or preset.
 */
export function resolveCheckPlan(
  args: string[],
  env?: Record<string, string | undefined>,
): { stages: CheckTask[][]; serial: boolean; deployGate: boolean };
