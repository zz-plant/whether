"use client";

import type { MouseEvent, ReactNode } from "react";
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

  const handleCopyClick = async (event: MouseEvent<HTMLAnchorElement>) => {
    if (!copyText) {
      return;
    }

    if (!navigator.clipboard?.writeText) {
      return;
    }

    event.preventDefault();
    const copied = await copyToClipboard(copyText, resolvedCopyTarget);
    if (!copied) {
      window.location.assign(href);
    }
  };

  return (
    <a
      href={href}
      onClick={copyText ? handleCopyClick : undefined}
      aria-busy={copyText ? isCopying : undefined}
      className={className}
    >
      {isCopying ? "Copying" : (children ?? label)}
    </a>
  );
}
