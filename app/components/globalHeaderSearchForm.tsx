import { GLOBAL_HEADER_SEARCH_BUTTON_CLASSNAME } from "./globalHeaderShared";

type GlobalHeaderSearchFormProps = {
  className?: string;
  compact?: boolean;
};

export function GlobalHeaderSearchForm({ className, compact = false }: GlobalHeaderSearchFormProps) {
  const resolvedClassName = ["weather-topbar-search", className].filter(Boolean).join(" ");

  return (
    <form action="/search" className={resolvedClassName} role="search" aria-label="Search Whether guidance">
      <label htmlFor="global-header-search" className="sr-only">
        Search Whether guidance
      </label>
      <input
        id="global-header-search"
        type="search"
        name="q"
        className={`weather-input px-4 text-base sm:text-sm ${compact ? "min-h-[44px] min-w-[12rem]" : "min-h-[48px] min-w-[13rem]"}`}
        placeholder="Search: hiring plan, fundraising, trust..."
        autoComplete="off"
      />
      <button
        type="submit"
        className={`${GLOBAL_HEADER_SEARCH_BUTTON_CLASSNAME} ${compact ? "min-h-[44px] px-4 text-xs" : "shrink-0"}`}
        aria-label="Search this question"
      >
        Search
      </button>
    </form>
  );
}
