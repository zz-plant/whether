/**
 * The frame every Whether email is sent in: the dark page, the title, the
 * button to the brief, the disclaimer, and the footer links with the
 * one-click unsubscribe.
 *
 * There were three. `lib/alert/alertTemplates.ts` had `baseHtml`;
 * `lib/email/sendWeeklyBrief.ts` carried a copy of it inline; and the
 * month-end pulse had its own, with no footer and no unsubscribe link in the
 * HTML part. The copy is why the 2026-09-17 fix that resolved the weekly
 * email's links through `lib/siteUrl` never reached the alerts: their shell,
 * their unsubscribe URL and their text bodies still wrote the production
 * origin, so a preview deployment mailed links to production. One shell, one
 * origin.
 */
import { siteUrl } from "../siteUrl";
import { OG_BG, OG_RULE, OG_TEXT, OG_TEXT_MUTED, OG_TEXT_SECONDARY } from "../image/ogTheme";

/** Escapes text for an HTML body or a quoted attribute. The one copy every email uses. */
export const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/**
 * The one-click unsubscribe URL for a subscriber token, or null without one.
 *
 * `/api/email/unsubscribe` has always worked and nothing has ever linked to it: no
 * template in this repo carried the link, on either mail stream. That was tolerable
 * while alert mail reached nobody; it is not, now that an opt-in actually enrolls
 * someone. A missing token yields no link rather than a broken one.
 */
const buildUnsubscribeUrl = (token: string | null | undefined): string | null =>
  token ? `${siteUrl}/api/email/unsubscribe?token=${encodeURIComponent(token)}` : null;

const unsubscribeFooterHtml = (token: string | null | undefined): string => {
  const url = buildUnsubscribeUrl(token);
  return url
    ? ` · <a href="${url}" style="color:${OG_TEXT_MUTED};text-decoration:underline;">Unsubscribe</a>`
    : "";
};

export const unsubscribeFooterText = (token: string | null | undefined): string[] => {
  const url = buildUnsubscribeUrl(token);
  return url ? [`Unsubscribe: ${url}`] : [];
};

/** The plain-text part's closing lines, under the body. */
export const emailTextFooter = (token: string | null | undefined): string[] => [
  `---`,
  `Whether · weekly operating brief`,
  ...unsubscribeFooterText(token),
];

/**
 * The HTML part. `body` is markup the caller built; `title` is text and is
 * escaped here. The colours are the site's dark theme (lib/image/ogTheme.ts):
 * the night-chart ground, the ink, and the button filled with the ink as the
 * site's primary is.
 */
export const renderEmailShell = ({
  title,
  body,
  unsubscribeToken,
}: {
  title: string;
  body: string;
  unsubscribeToken?: string | null;
}): string =>
  [
    `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;background:${OG_BG};color:${OG_TEXT_SECONDARY};">`,
    `<h1 style="font-size:1.25rem;font-weight:600;margin:0 0 4px;color:${OG_TEXT};">${escapeHtml(title)}</h1>`,
    body,
    `<div style="margin-top:24px;">`,
    `<a href="${siteUrl}" style="display:inline-block;padding:12px 24px;border-radius:8px;background:${OG_TEXT};color:${OG_BG};text-decoration:none;font-weight:600;font-size:0.9rem;">View full brief →</a>`,
    `</div>`,
    `<p style="margin-top:32px;font-size:0.75rem;color:${OG_TEXT_MUTED};">Based on public data. Your situation may vary.</p>`,
    `<hr style="border:none;border-top:1px solid ${OG_RULE};margin-top:24px;" />`,
    `<table role="presentation" style="width:100%;border-collapse:collapse;"><tr>`,
    `<td style="font-size:0.7rem;color:${OG_TEXT_MUTED};padding-top:12px;">`,
    `<a href="${siteUrl}/trust" style="color:${OG_TEXT_MUTED};text-decoration:underline;">Methodology</a>`,
    ` · `,
    `<a href="${siteUrl}/share" style="color:${OG_TEXT_MUTED};text-decoration:underline;">Share</a>`,
    ` · `,
    `<a href="${siteUrl}" style="color:${OG_TEXT_MUTED};text-decoration:underline;">whether.work</a>`,
    unsubscribeFooterHtml(unsubscribeToken),
    `</td></tr></table>`,
    `</body></html>`,
  ].join("\n");
