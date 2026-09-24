"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { isRoute } from "../../lib/navigation/routeType";
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
  const { status, activeTarget, copyToClipboard } = useClipboardCopy({ commitment: "copied_brief" });
  const router = useRouter();
  const resolvedCopyTarget = copyTarget ?? label;
  const isCopying = status === "copying" && activeTarget === resolvedCopyTarget;
  const isCopied = status === "copied";
  const hasCopyError = status === "error";
  const copyLabel = isCopying ? "Copying" : isCopied ? "Copied" : hasCopyError ? "Retry copy" : label;

  const trackActivation = () => {
    if (!telemetryEvent) {
      return;
    }

    trackContentCtaConversion(telemetryEvent);
  };

  /* Where the reader lands when the copy cannot happen: the same `href` a
     plain link would follow, reached through the router for a route and the
     fragment for an in-page anchor. */
  const followHref = () => {
    if (isRoute(href)) {
      router.push(href);
    } else {
      window.location.assign(href);
    }
  };

  const handleCopyClick = async () => {
    if (!copyText) {
      return;
    }

    if (!navigator.clipboard?.writeText) {
      followHref();
      return;
    }

    trackActivation();
    const copied = await copyToClipboard(copyText, resolvedCopyTarget);
    if (!copied) {
      followHref();
    }
  };

  /* A copy action is a button, not a link whose click is intercepted (§IV):
     an anchor announces a destination, and the destination here is only the
     fallback for a clipboard that is not there. */
  if (copyText) {
    return (
      <button
        type="button"
        onClick={handleCopyClick}
        aria-busy={isCopying}
        className={className}
      >
        {children ?? copyLabel}
      </button>
    );
  }

  if (isRoute(href)) {
    return (
      <Link
        href={href}
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
      onClick={telemetryEvent ? trackActivation : undefined}
      className={className}
    >
      {children ?? label}
    </a>
  );
}
