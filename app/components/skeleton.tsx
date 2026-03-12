import type { HTMLAttributes } from "react";

export const Skeleton = ({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`animate-pulse rounded-md bg-slate-600/70 ${className}`.trim()}
    aria-hidden="true"
    {...props}
  />
);
