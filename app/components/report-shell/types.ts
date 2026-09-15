import type {
  ContentCluster,
  ContentIntent,
} from "../../../lib/contentMeasurement";

export type ReportCtaProps = {
  href: string;
  label: string;
  copyText?: string;
  copyTarget?: string;
  telemetryEvent?: {
    pagePath: string;
    cluster: ContentCluster;
    intent: ContentIntent;
    ctaId: string;
  };
};

export type ExportCtaProps = ReportCtaProps;
