import type { DecisionModel, JevRequest } from "./jevClient";

const MIB = 1024 * 1024;
const mediaLimits = {
  images: { count: 4, bytes: 4 * MIB, mime: /^(image\/png|image\/jpeg|image\/webp)$/ },
  audio: { count: 4, bytes: 8 * MIB, mime: /^(audio\/wav|audio\/mpeg)$/ },
  videos: { count: 2, bytes: 16 * MIB, mime: /^(video\/mp4|video\/webm)$/ },
};

/** Hosted schema bounds. Duration, pixel dimensions and context are checked by the service. */
export const validateDecisionMedia = (request: JevRequest, model: DecisionModel): string | null => {
  let imageBytes = 0;
  let clipBytes = 0;
  for (const kind of ["images", "audio", "videos"] as const) {
    const items = request[kind] ?? [];
    if (!items.length) continue;
    if (model === "jev" || (kind !== "images" && model !== "clef-omni")) {
      return `${model} does not support ${kind} in this client`;
    }
    const limit = mediaLimits[kind];
    if (items.length > limit.count) return `too many ${kind}: maximum ${limit.count}`;
    for (const item of items) {
      const separator = item.indexOf(";base64,");
      const mime = item.slice(5, separator);
      if (!item.startsWith("data:") || separator < 0 || !limit.mime.test(mime)) return `invalid ${kind} data URL or MIME type`;
      const encoded = item.slice(separator + 8);
      if (encoded.length > Math.ceil(limit.bytes / 3) * 4) return `${kind} exceeds decoded byte limit`;
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 !== 0) return `invalid ${kind} base64`;
      let bytes: number;
      try { bytes = atob(encoded).length; } catch { return `invalid ${kind} base64`; }
      if (bytes > limit.bytes) return `${kind} exceeds decoded byte limit`;
      if (kind === "images") imageBytes += bytes;
      else clipBytes += bytes;
    }
  }
  if (imageBytes > 8 * MIB || clipBytes > 16 * MIB) return "media exceeds combined decoded byte limit";
  if (model !== "jev" && model !== "clef-omni" && new TextEncoder().encode(JSON.stringify(request)).length > 13 * MIB) {
    return "request exceeds 13 MiB hosted body limit";
  }
  return null;
};
