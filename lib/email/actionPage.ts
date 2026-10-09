import { escapeHtml } from "./emailShell";

/**
 * The small page an email link opens: confirm a subscription, or leave one.
 *
 * Both links change a record, and mail filters that open every link to scan it
 * (Outlook Safe Links, Proofpoint) would make that change on a reader's behalf
 * if opening the link did it. So each link opens one of these, which says what
 * pressing its button will do, and only the button's POST does it. `no-store`
 * and `no-referrer` because the token is in the URL.
 */
export const actionPage = (title: string, body: string, status = 200) =>
  new Response(
    [
      "<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>",
      `<meta name='robots' content='noindex'><title>${escapeHtml(title)} · Whether</title></head>`,
      "<body style='font-family:sans-serif;max-width:480px;margin:40px auto;padding:20px;color:#121719;text-align:center;'>",
      "<main>",
      `<h1 style='font-size:1.1rem;font-weight:600;'>${escapeHtml(title)}</h1>`,
      body,
      "</main>",
      "</body></html>",
    ].join(""),
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );

export const actionParagraph = (text: string) => `<p style='font-size:0.95rem;color:#384145;'>${escapeHtml(text)}</p>`;

export const ACTION_HOME_LINK =
  "<a href='/' style='display:inline-block;margin-top:16px;padding:8px 16px;border-radius:6px;background:#121719;color:#fff;text-decoration:none;font-size:0.9rem;'>Return to Whether</a>";

/** The one button the page offers, posting the token back to `action`. */
export const actionForm = (action: string, token: string, label: string) =>
  [
    `<form method='post' action='${escapeHtml(action)}'>`,
    `<input type='hidden' name='token' value='${escapeHtml(token)}'>`,
    `<button type='submit' style='margin-top:8px;padding:10px 20px;border:0;border-radius:6px;background:#121719;color:#fff;font-weight:600;font-size:0.95rem;cursor:pointer;'>${escapeHtml(label)}</button>`,
    "</form>",
  ].join("");

/** The token a page's button posted, or null for a body that is not a form. */
export const postedToken = async (request: Request): Promise<string | null> => {
  try {
    const value = (await request.formData()).get("token");
    return typeof value === "string" && value ? value : null;
  } catch {
    return null;
  }
};
