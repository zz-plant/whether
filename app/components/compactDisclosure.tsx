import type { ReactNode } from "react";

type CompactDisclosureProps = {
  summary: string;
  className?: string;
  summaryClassName: string;
  children: ReactNode;
  id?: string;
};

export function CompactDisclosure({
  summary,
  className,
  summaryClassName,
  children,
  id,
}: CompactDisclosureProps) {
  return (
    <details id={id} className={className}>
      <summary className={`${summaryClassName} cursor-pointer list-none`}>
        <span>{summary}</span>
        <span aria-hidden="true" className="text-sm transition group-open:rotate-180">▾</span>
      </summary>
      {children}
    </details>
  );
}

