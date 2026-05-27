import type { ReactNode } from "react";

export function V2ToolsPanel({ children }: { children?: ReactNode }) {
  return (
    <div className="space-y-4">
      {children}
    </div>
  );
}
