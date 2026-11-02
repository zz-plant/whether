import { readSetting } from "../runtime/settings";
import { siteUrl } from "../siteUrl";

/**
 * IndexNow: tell Bing and Yandex a URL changed instead of waiting for a crawl.
 *
 * Google does not use IndexNow, so this is a supplement to the sitemap, not a
 * replacement. It is a no-op without `INDEXNOW_KEY`, which keeps every existing
 * environment working and makes the feature opt-in by setting one secret.
 */
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** Where the key file is served, matching `app/indexnow/[key]/route.ts`. */
const indexNowKeyLocation = (key: string): string => `${siteUrl}/indexnow/${key}.txt`;

type IndexNowResult = {
  submitted: number;
  status?: number;
  skipped?: string;
};

export const submitIndexNow = async (
  urls: readonly string[],
  { key = readSetting("INDEXNOW_KEY"), fetchImpl = fetch }: {
    key?: string | null;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<IndexNowResult> => {
  if (!key) return { submitted: 0, skipped: "no INDEXNOW_KEY" };

  const host = new URL(siteUrl).host;
  const urlList = [...new Set(urls)].filter((url) => {
    try {
      return new URL(url).host === host;
    } catch {
      return false;
    }
  });

  if (urlList.length === 0) return { submitted: 0, skipped: "no same-host urls" };

  try {
    const response = await fetchImpl(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key, keyLocation: indexNowKeyLocation(key), urlList }),
    });
    return { submitted: urlList.length, status: response.status };
  } catch {
    /* A failed ping must not fail the publish that triggered it. */
    return { submitted: 0, skipped: "request failed" };
  }
};
