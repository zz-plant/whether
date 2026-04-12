import { WHETHER_ICON_SVG, buildSvgResponse } from "../brandAssets";

export const runtime = "edge";

export function GET() {
  return buildSvgResponse(WHETHER_ICON_SVG);
}
