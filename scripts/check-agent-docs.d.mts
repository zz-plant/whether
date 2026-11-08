export type AgentDocsCheck = {
  checked: number;
  failures: string[];
};

export function checkAgentDocs(args?: { repoRoot?: string }): AgentDocsCheck;
