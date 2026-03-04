export type BreadcrumbItem = {
  name: string;
  path: string;
};

const canonicalBreadcrumbLabels: Record<string, string> = {
  "/": "Home",
  "/evidence": "Signal evidence",
  "/operations": "Operations",
  "/resources": "Resources",
  "/reference": "Reference",
  "/concepts": "Concepts",
  "/solutions": "Solutions",
  "/solutions/career-paths": "Career paths",
  "/toolkits": "Toolkits",
  "/learn": "Learn",
  "/method": "Method",
  "/formulas": "Formulas",
};

const toTitleCase = (value: string) =>
  value
    .replace(/[-_]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const getBreadcrumbLabel = (path: string, fallbackLabel?: string) => {
  if (fallbackLabel) {
    return fallbackLabel;
  }

  const normalizedPath = path === "/" ? "/" : path.replace(/\/$/, "");
  const label = canonicalBreadcrumbLabels[normalizedPath];

  if (label) {
    return label;
  }

  const segments = normalizedPath.split("/").filter(Boolean);
  return segments.length ? toTitleCase(segments[segments.length - 1]) : "Home";
};

export const createBreadcrumbItem = (path: string, label?: string): BreadcrumbItem => ({
  name: getBreadcrumbLabel(path, label),
  path,
});

export const createBreadcrumbTrail = (
  items: Array<{ path: string; label?: string }>,
): BreadcrumbItem[] => items.map((item) => createBreadcrumbItem(item.path, item.label));
