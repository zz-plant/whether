const ROUTE_ALIASES: Record<string, string[]> = {
  "/signals": ["/evidence"],
  "/operate": ["/planning"],
  "/resolve": ["/answer", "/answers"],
};

// "/answer" is the legacy spelling of this route. "/answers" is also the root
// of the standalone /answers/[slug] article catalog
// (see app/answers/[slug]/page.tsx), a distinct page set — not part of the
// /resolve decision-tools hub. Only the bare path should alias; subpaths must
// not be swallowed by the report-shell/nav-active logic.
const EXACT_ONLY_ALIASES = new Set(["/answers"]);

export const pathMatchesLink = (linkHref: string, currentPath: string) => {
  if (linkHref === "/") {
    return currentPath === "/";
  }

  const normalizedCurrent = currentPath.split("?")[0].split("#")[0];

  if (normalizedCurrent === linkHref || normalizedCurrent.startsWith(`${linkHref}/`)) {
    return true;
  }

  const aliases = ROUTE_ALIASES[linkHref];
  if (aliases) {
    return aliases.some((alias) =>
      EXACT_ONLY_ALIASES.has(alias)
        ? normalizedCurrent === alias
        : normalizedCurrent === alias || normalizedCurrent.startsWith(`${alias}/`),
    );
  }

  return false;
};
