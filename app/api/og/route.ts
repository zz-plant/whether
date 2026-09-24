/**
 * Open Graph images for every shareable page. Which card a URL gets, and what it
 * says, is decided in `renderOgElement` so it can be tested without a server;
 * this handler only loads the fonts, renders, and sets the cache policy.
 */
import { ImageResponse } from "next/og";
import { loadOgFonts } from "../../../lib/image/ogFonts";
import { renderOgElement } from "./renderOgElement";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

export const runtime = "edge";
export const revalidate = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fonts = await loadOgFonts(request.url);
  const image = new ImageResponse(await renderOgElement(searchParams), {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    ...(fonts ? { fonts } : {}),
  });

  image.headers.set("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=86400");

  return image;
}
