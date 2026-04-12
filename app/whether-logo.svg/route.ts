import { WHETHER_LOGO_SVG, buildSvgResponse } from "../brandAssets";

export const runtime = "edge";

export function GET() {
  return buildSvgResponse(WHETHER_LOGO_SVG);
}
