import { GLOBAL_HEADER_SEARCH_BUTTON_CLASSNAME } from "./globalHeaderShared";

type GlobalHeaderSearchFormProps = {
  className?: string;
};

export function GlobalHeaderSearchForm({ className }: GlobalHeaderSearchFormProps) {
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
        className="weather-input min-h-[48px] min-w-[13rem] px-4 text-sm"
        placeholder="Search decisions, toolkits, concepts…"
        autoComplete="off"
      />
      <button
        type="submit"
        className={`${GLOBAL_HEADER_SEARCH_BUTTON_CLASSNAME} shrink-0`}
        aria-label="Run global search"
      >
        Search
      </button>
    </form>
  );
}
