"use client";

import { Button } from "@base-ui/react/button";
import { useEffect, useState } from "react";

type ManualRefreshButtonProps = {
  label?: string;
  refreshingLabel?: string;
  successLabel?: string;
  className?: string;
  title?: string;
};

export function ManualRefreshButton({
  label = "Refresh now",
  refreshingLabel = "Refreshing…",
  successLabel = "Updated just now",
  className,
  title,
}: ManualRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [wasRefreshed, setWasRefreshed] = useState(false);

  useEffect(() => {
    if (!wasRefreshed) {
      return;
    }

    const timer = window.setTimeout(() => {
      setWasRefreshed(false);
    }, 8000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [wasRefreshed]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setWasRefreshed(true);

    window.location.reload();
  };

  return (
    <Button
      type="button"
      onClick={handleRefresh}
      disabled={isRefreshing}
      aria-busy={isRefreshing}
      title={title}
      className={className ?? "weather-pill inline-flex min-h-[44px] items-center justify-center px-3 py-2 text-xs font-semibold tracking-[0.12em] text-slate-200 hover:border-sky-400/70 hover:text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"}
    >
      {isRefreshing ? refreshingLabel : wasRefreshed ? successLabel : label}
    </Button>
  );
}
