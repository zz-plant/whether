import { artifactModeLabels, type ArtifactMode } from "./literacyAssist";

export const ARTIFACT_MODE_QUERY_PARAM = "artifactMode";

export const isArtifactMode = (value: string | null | undefined): value is ArtifactMode =>
  value === "operator" || value === "explainer";

export const parseArtifactModeFromSearch = (search: string): ArtifactMode | null => {
  const params = new URLSearchParams(search);
  const value = params.get(ARTIFACT_MODE_QUERY_PARAM);
  return isArtifactMode(value) ? value : null;
};

export const buildArtifactModeHref = (href: string, mode: ArtifactMode) => {
  const url = new URL(href);
  if (mode === "operator") {
    url.searchParams.delete(ARTIFACT_MODE_QUERY_PARAM);
  } else {
    url.searchParams.set(ARTIFACT_MODE_QUERY_PARAM, mode);
  }
  return url.toString();
};

export const buildArtifactShareTitle = (mode: ArtifactMode) =>
  `Whether ${artifactModeLabels[mode]}`;

export const buildArtifactShareText = ({
  mode,
  summary,
  brief,
  url,
}: {
  mode: ArtifactMode;
  summary: string;
  brief: string;
  url: string;
}) =>
  [
    buildArtifactShareTitle(mode),
    summary,
    brief,
    `Open: ${url}`,
  ].join("\n\n");
