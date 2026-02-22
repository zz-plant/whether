const DEFAULT_SITE_URL = "https://whether.work";

const hasProtocol = (value: string) => /^https?:\/\//i.test(value);

const normalizeProtocol = (value: string) => (hasProtocol(value) ? value : `https://${value}`);

export const resolveSiteUrl = (value = process.env.NEXT_PUBLIC_SITE_URL): string => {
  if (!value) {
    return DEFAULT_SITE_URL;
  }

  const normalized = normalizeProtocol(value.trim());

  try {
    const url = new URL(normalized);
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
};

export const siteUrl = resolveSiteUrl();
