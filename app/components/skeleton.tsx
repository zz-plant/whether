import type { HTMLAttributes } from "react";

export const Skeleton = ({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`weather-skeleton rounded-md ${className}`.trim()}
    aria-hidden="true"
    {...props}
  >
    <span className="weather-skeleton__shimmer" />
  </div>
);
