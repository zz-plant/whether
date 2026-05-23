"use client";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center">
      <svg className="w-10 h-10 text-slate-700" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1">
        <circle cx="20" cy="20" r="18" />
        <circle cx="20" cy="20" r="6" />
      </svg>
      <div>
        <p className="text-sm font-medium text-slate-400">{title}</p>
        {description ? (
          <p className="mt-1 text-xs text-slate-600 max-w-xs mx-auto">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
