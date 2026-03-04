"use client";

import type { ReactNode } from "react";
import { useClipboardCopy } from "./useClipboardCopy";

type ReportCtaProps = {
  href: string;
  label: string;
  className: string;
  copyText?: string;
  copyTarget?: string;
  children?: ReactNode;
};

export function ReportCta({ href, label, className, copyText, copyTarget, children }: ReportCtaProps) {
  const { status, activeTarget, copyToClipboard } = useClipboardCopy();
  const resolvedCopyTarget = copyTarget ?? label;
  const isCopying = status === "copying" && activeTarget === resolvedCopyTarget;

  if (!copyText) {
    return (
      <a href={href} className={className}>
        {children ?? label}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => copyToClipboard(copyText, resolvedCopyTarget)}
      disabled={isCopying}
      aria-busy={isCopying}
      className={className}
    >
      {isCopying ? "Copying" : (children ?? label)}
    </button>
  );
}
