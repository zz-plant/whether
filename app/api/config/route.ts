/**
 * API route for setting user configuration (ticker, stage) via cookies.
 * Called by the client-side BriefConfigureStrip component so that
 * the server-side parseOperatorContextFromCookies picks up the values.
 */

import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      ticker?: string;
      stage?: string;
    };

    const { ticker, stage } = body;

    // Validate ticker (alphanumeric, 1-10 chars)
    const sanitizedTicker =
      ticker && /^[A-Za-z0-9.]{1,10}$/.test(ticker.trim())
        ? ticker.trim().toUpperCase()
        : null;

    // Validate stage
    const validStages = ["seed", "series-a", "growth", "public", ""];
    const sanitizedStage = stage !== undefined && validStages.includes(stage) ? stage : null;

    const response = NextResponse.json({ ok: true });

    // Set cookies with 90-day expiry
    const maxAge = 90 * 24 * 60 * 60; // 90 days in seconds
    const cookieOptions = {
      maxAge,
      path: "/",
      sameSite: "lax" as const,
      secure: true,
    };

    if (sanitizedTicker !== null) {
      response.cookies.set("whether-ticker", sanitizedTicker, cookieOptions);
    }

    if (sanitizedStage !== null) {
      if (sanitizedStage) {
        response.cookies.set("whether-company-stage", sanitizedStage, cookieOptions);
      } else {
        response.cookies.set("whether-company-stage", "", { ...cookieOptions, maxAge: 0 });
      }
    }

    return response;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
}