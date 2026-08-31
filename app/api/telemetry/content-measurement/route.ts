import { POST as handleTelemetryPost } from "../[stream]/route";

export const runtime = "edge";

export async function POST(request: Request) {
  return handleTelemetryPost(request, { params: { stream: "content-measurement" } });
}
