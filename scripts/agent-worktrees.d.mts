export type WorktreeEntry = {
  path: string;
  head: string;
  branch: string;
  detached: boolean;
  locked: boolean;
  prunable: string;
};

export function parseWorktreeList(output: string): WorktreeEntry[];

export function isPrunable(
  entry: WorktreeEntry & { dirty: number },
  options: {
    mainPath: string;
    merged: boolean;
    branchExists: boolean;
    ageDays?: number;
    minAgeDays?: number;
  },
): boolean;
