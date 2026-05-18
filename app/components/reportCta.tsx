"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import type { Route } from "../../lib/navigation/routeType";
import { trackContentCtaConversion } from "../../lib/contentMeasurement";
import { useClipboardCopy } from "./useClipboardCopy";
import type { ReportCtaProps as SharedReportCtaProps } from "./report-shell/types";

type ReportCtaProps = SharedReportCtaProps & {
  className: string;
  children?: ReactNode;
};

export function ReportCta({
  href,
  label,
  className,
  copyText,
  copyTarget,
  telemetryEvent,
  children,
}: ReportCtaProps) {
  const { status, activeTarget, copyToClipboard } = useClipboardCopy();
  const router = useRouter();
  const resolvedCopyTarget = copyTarget ?? label;
  const isCopying = status === "copying" && activeTarget === resolvedCopyTarget;
  const isCopied = status === "copied";
  const hasCopyError = status === "error";
  const isRouteHref = href.startsWith("/");
  const copyLabel = isCopying ? "Copying" : isCopied ? "Copied" : hasCopyError ? "Retry copy" : label;

  const trackActivation = () => {
    if (!telemetryEvent) {
      return;
    }

    trackContentCtaConversion(telemetryEvent);
  };

  const handleCopyClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (!copyText) {
      return;
    }

    if (!navigator.clipboard?.writeText) {
      return;
    }

    event.preventDefault();
    trackActivation();
    const copied = await copyToClipboard(copyText, resolvedCopyTarget);
    if (!copied) {
      router.push(href as Route);
    }
  };

  if (!copyText && isRouteHref) {
    return (
      <Link
        href={href as Route}
        className={className}
        onClick={telemetryEvent ? trackActivation : undefined}
      >
        {children ?? label}
      </Link>
    );
  }

  return (
    <a
      href={href}
      onClick={copyText ? handleCopyClick : telemetryEvent ? trackActivation : undefined}
      aria-busy={copyText ? isCopying : undefined}
      className={className}
    >
      {children ?? (copyText ? copyLabel : label)}
    </a>
  );
}
