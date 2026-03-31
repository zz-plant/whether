import type { Route } from "../../../lib/navigation/routeType";

export type ReportCtaProps = {
  href: string;
  label: string;
  copyText?: string;
  copyTarget?: string;
};

export type SecondaryCtaProps = { href: string; label: string };
export type ExportCtaProps = { href: string; label: string };

export type DecisionBanner = {
  label?: string;
  decision: string;
  horizon: string;
  confidence: string;
  confidenceScore?: number;
  effectiveDate: string;
  evidenceHref?: string;
};

export type ActionSequence = {
  title: string;
  items: Array<{ title: string; detail: string; href: string; cta: string }>;
};

export type RoleSwitcher = {
  active: string;
  options: Array<{ key: string; label: string; href: Route }>;
};

export type DecisionDiff = { label: string; tone?: "neutral" | "positive" | "warning" };

export type DegradedSourceRow = {
  sourceName: string;
  modeLabel: string;
  freshnessStatus: string;
};

export type ApprovalBucket = { label: string; detail: string };

export type RecoveryPlan = {
  owner: string;
  nextCheckpoint: string;
  exitCondition: string;
};

export type OutageExitGate = {
  label: string;
  summary: string;
  metCount: number;
  totalCount: number;
};
