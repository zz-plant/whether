const ROUTE_ALIASES: Record<string, string[]> = {
  "/signals": ["/evidence"],
  "/operate": ["/planning"],
  "/answer": ["/resolve", "/answers"],
};

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
    return aliases.some(
      (alias) => normalizedCurrent === alias || normalizedCurrent.startsWith(`${alias}/`),
    );
  }

  return false;
};
