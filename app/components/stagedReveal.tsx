"use client";

import { useEffect, useState, type ReactNode } from "react";

type StagedRevealProps = {
  delayMs?: number;
  children: ReactNode;
  placeholder?: ReactNode;
};

export const StagedReveal = ({ delayMs = 0, children, placeholder = null }: StagedRevealProps) => {
  const [visible, setVisible] = useState(delayMs === 0);

  useEffect(() => {
    if (delayMs === 0) return;

    const timeoutId = window.setTimeout(() => {
      setVisible(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs]);

  if (!visible) return <>{placeholder}</>;

  return <>{children}</>;
};
