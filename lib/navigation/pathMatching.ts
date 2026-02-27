export const pathMatchesLink = (linkHref: string, currentPath: string) => {
  if (linkHref === "/") {
    return currentPath === "/";
  }

  return currentPath === linkHref || currentPath.startsWith(`${linkHref}/`);
};
