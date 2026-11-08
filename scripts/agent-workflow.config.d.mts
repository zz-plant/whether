export type TaskProfile = {
  id: string;
  label: string;
  rationale: string;
  keywords: string[];
  docs: string[];
  targets: string[];
  skills: string[];
  checks: string[];
};

export const SKILLS_DIRECTORY: string;

export const LESSONS_TABLE: { file: string; heading: string };

export const DOC_SECTIONS: Array<{
  doc: string;
  section: string;
  title: string;
  keywords: string[];
}>;

export const PATH_PROFILE_HINTS: Array<{ profile: string; prefixes: string[] }>;

export const CORE_SURFACES: string[];

export const TASK_PROFILES: TaskProfile[];

export const DEFAULT_PROFILE: TaskProfile;

export const TOOL_HINTS: Array<{
  id: string;
  keywords: string[];
  command: string;
  why: string;
}>;
