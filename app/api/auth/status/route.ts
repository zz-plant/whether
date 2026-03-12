import { NextResponse } from "next/server";

export const runtime = "edge";
export const revalidate = 0;
export const dynamic = "force-dynamic";

const readServerToken = () => {
  const primary = process.env.WHETHER_API_KEY;
  if (typeof primary === "string" && primary.trim().length > 0) return primary.trim();
  const fallback = process.env.WHETHER_TOKEN;
  if (typeof fallback === "string" && fallback.trim().length > 0) return fallback.trim();
  return null;
};

const parseBearerToken = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.toLowerCase().startsWith("bearer ")) return null;
  const token = trimmed.slice(7).trim();
  return token.length > 0 ? token : null;
};

export async function GET(request: Request) {
  const serverToken = readServerToken();
  const token = parseBearerToken(request.headers.get("authorization"));

  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }

  if (!serverToken || token !== serverToken) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, authenticated: true });
}
