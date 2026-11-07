import type { ReactNode } from "react";

/* The column names, repeated inside each cell for the stacked phone layout,
   where the header row is not drawn. Hidden from md up, where the header is,
   unless the header cannot name the cell (`fromMd`). */
export const CellLabel = ({ children, className = "", fromMd = false }: { children: ReactNode; className?: string; fromMd?: boolean }) => (
  <span className={`mb-0.5 block text-xs font-medium ${fromMd ? "" : "md:hidden"} ${className}`.replace(/\s+/g, " ").trim()}>{children}</span>
);
