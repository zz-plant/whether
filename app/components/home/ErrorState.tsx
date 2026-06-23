"use client";

type ErrorStateProps = {
  title: string;
  description?: string;
  onRetry?: () => void;
};

export function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 text-center">
      <svg className="w-10 h-10 text-rose-700/60" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1">
        <circle cx="20" cy="20" r="18" />
        <path d="M20 12v10M20 28h0" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div>
        <p className="text-sm font-medium text-rose-300">{title}</p>
        {description ? (
          <p className="mt-1 text-xs text-slate-400 max-w-xs mx-auto">{description}</p>
        ) : null}
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/20 transition-colors"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
