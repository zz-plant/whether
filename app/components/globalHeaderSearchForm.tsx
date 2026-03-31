import { GLOBAL_HEADER_SEARCH_BUTTON_CLASSNAME } from "./globalHeaderShared";

type GlobalHeaderSearchFormProps = {
  className?: string;
  compact?: boolean;
};

export function GlobalHeaderSearchForm({ className, compact = false }: GlobalHeaderSearchFormProps) {
  const resolvedClassName = ["weather-topbar-search", className].filter(Boolean).join(" ");

  return (
    <form action="/search" className={resolvedClassName} role="search" aria-label="Global search">
      <label htmlFor="global-header-search" className="sr-only">
        Search Whether content
      </label>
      <input
        id="global-header-search"
        type="search"
        name="q"
        className={`weather-input px-4 text-sm ${compact ? "min-h-[44px] min-w-[12rem]" : "min-h-[48px] min-w-[13rem]"}`}
        placeholder="Search evidence, planning, trust…"
        autoComplete="off"
      />
      <button
        type="submit"
        className={`${GLOBAL_HEADER_SEARCH_BUTTON_CLASSNAME} ${compact ? "min-h-[44px] px-4 text-xs" : "shrink-0"}`}
        aria-label="Run global search"
      >
        Search
      </button>
    </form>
  );
}
