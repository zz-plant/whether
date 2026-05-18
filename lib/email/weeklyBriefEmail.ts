/**
 * Weekly brief email template.
 * Renders a scannable, notification-height email for the bounded decision brief.
 * Follows the same bounded decision format as the web UI but optimized for
 * preview pane reading and mobile-first layout.
 */

export type WeeklyBriefEmailProps = {
  recordDate: string;
  regimeLabel: string;
  confidenceLabel: string;
  postureLabel: string;
  operatingCall: string;
  actionNow: string;
  doNowItems: string[];
  flipTrigger: string;
  reversalCondition: string;
  dataFreshness: string;
  briefUrl: string;
  tickerLabel?: string;
  trustStatusLabel?: string;
};

const EMAIL_STYLES = `
<style>
  .weather-email {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 560px;
    margin: 0 auto;
    padding: 16px;
    color: #1e293b;
    background: #ffffff;
  }
  .weather-header {
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .weather-brand {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #0f172a;
  }
  .weather-tagline {
    font-size: 12px;
    color: #64748b;
    margin-top: 2px;
  }
  .weather-decision-call {
    background: #f0f9ff;
    border-left: 3px solid #38bdf8;
    padding: 12px 14px;
    margin: 16px 0;
    border-radius: 6px;
  }
  .weather-decision-call h2 {
    font-size: 13px;
    font-weight: 600;
    color: #0284c7;
    margin: 0 0 4px 0;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .weather-decision-call p {
    font-size: 16px;
    font-weight: 600;
    color: #0f172a;
    margin: 0;
    line-height: 1.4;
  }
  .weather-meta {
    font-size: 11px;
    color: #64748b;
    margin: 8px 0 16px 0;
  }
  .weather-actions {
    margin: 16px 0;
  }
  .weather-action-item {
    padding: 8px 0;
    border-bottom: 1px solid #f1f5f9;
  }
  .weather-action-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #64748b;
  }
  .weather-action-text {
    font-size: 14px;
    color: #1e293b;
    margin-top: 2px;
  }
  .weather-flip-box {
    background: #fffbeb;
    border-left: 3px solid #f59e0b;
    padding: 10px 14px;
    margin: 16px 0;
    border-radius: 6px;
    font-size: 12px;
  }
  .weather-flip-box strong {
    font-weight: 600;
    color: #92400e;
  }
  .weather-flip-box p {
    margin: 4px 0;
    color: #78350f;
  }
  .weather-footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 12px;
    margin-top: 20px;
    font-size: 11px;
    color: #94a3b8;
  }
  .weather-cta {
    display: inline-block;
    background: #0f172a;
    color: #ffffff !important;
    text-decoration: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    margin: 8px 0;
  }
  .weather-cta-link {
    color: #0284c7 !important;
    text-decoration: underline;
  }
  @media (prefers-color-scheme: dark) {
    .weather-email { background: #0f172a; color: #e2e8f0; }
    .weather-header { border-color: #1e293b; }
    .weather-brand { color: #f1f5f9; }
    .weather-tagline { color: #94a3b8; }
    .weather-decision-call { background: #0c1929; border-color: #38bdf8; }
    .weather-decision-call h2 { color: #7dd3fc; }
    .weather-decision-call p { color: #f1f5f9; }
    .weather-meta { color: #94a3b8; }
    .weather-action-item { border-color: #1e293b; }
    .weather-action-label { color: #94a3b8; }
    .weather-action-text { color: #e2e8f0; }
    .weather-flip-box { background: #1c1917; border-color: #f59e0b; }
    .weather-flip-box strong { color: #fbbf24; }
    .weather-flip-box p { color: #fef3c7; }
    .weather-footer { border-color: #1e293b; color: #64748b; }
    .weather-cta { background: #1e293b; color: #f1f5f9; }
    .weather-cta-link { color: #7dd3fc; }
  }
</style>
`;

export const buildWeeklyBriefEmailHtml = (props: WeeklyBriefEmailProps): string => {
  const {
    recordDate,
    regimeLabel,
    confidenceLabel,
    postureLabel,
    operatingCall,
    actionNow,
    doNowItems,
    flipTrigger,
    reversalCondition,
    dataFreshness,
    briefUrl,
    tickerLabel,
    trustStatusLabel,
  } = props;

  const subject = `Whether Brief — ${tickerLabel ? `${tickerLabel} — ` : ""}${regimeLabel} — ${operatingCall}`;

  const metaParts = [
    regimeLabel,
    confidenceLabel,
    `As of ${recordDate}`,
    tickerLabel,
    trustStatusLabel,
  ].filter(Boolean);

  const doNowHtml = doNowItems.length > 0
    ? `<div class="weather-actions">
        <p style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;margin-top:12px;margin-bottom:4px;">Do now</p>
        ${doNowItems.map((item) => `
          <div class="weather-action-item">
            <p class="weather-action-text">${item}</p>
          </div>
        `).join("")}
      </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${subject}</title>
  ${EMAIL_STYLES}
</head>
<body>
  <div class="weather-email">
    <div class="weather-header">
      <p class="weather-brand">Whether</p>
      <p class="weather-tagline">Weekly operating brief</p>
    </div>

    <p class="weather-meta">${metaParts.join(" • ")}</p>

    <div class="weather-decision-call">
      <h2>Operating call</h2>
      <p>${operatingCall}</p>
    </div>

    <p style="font-size:14px;color:#1e293b;margin:12px 0;">
      <strong>Decision now:</strong> ${actionNow}
    </p>

    ${doNowHtml}

    <div class="weather-flip-box">
      <strong>🔍 Watch</strong>
      <p>Flip trigger: ${flipTrigger}</p>
      <p>Reversal: ${reversalCondition}</p>
      <p style="font-size:11px;color:#64748b;margin-top:6px;">Data: ${dataFreshness}</p>
    </div>

    <table cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;">
      <tr>
        <td>
          <a href="${briefUrl}" class="weather-cta">Open full brief →</a>
        </td>
      </tr>
    </table>

    <p style="font-size:12px;color:#64748b;margin:8px 0;">
      <a href="${briefUrl}" class="weather-cta-link">View in browser</a>
    </p>

    <div class="weather-footer">
      <p>Whether is an operating brief for startup and product leaders, not investment advice.</p>
      <p style="margin-top:4px;">
        <a href="{{unsubscribe_url}}" style="color:#94a3b8;text-decoration:underline;">Unsubscribe</a>
        • <a href="{{manage_preferences_url}}" style="color:#94a3b8;text-decoration:underline;">Manage preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`;
};

export const buildWeeklyBriefEmailText = (props: WeeklyBriefEmailProps): string => {
  const {
    recordDate,
    regimeLabel,
    confidenceLabel,
    operatingCall,
    actionNow,
    doNowItems,
    flipTrigger,
    reversalCondition,
    dataFreshness,
    briefUrl,
    tickerLabel,
  } = props;

  const header = `Whether — Weekly Brief${tickerLabel ? ` — ${tickerLabel}` : ""}`;
  const meta = `${regimeLabel} • ${confidenceLabel} • As of ${recordDate}`;

  const doNowText = doNowItems.length > 0
    ? `\nDo now:\n${doNowItems.map((item) => `  • ${item}`).join("\n")}`
    : "";

  return `${header}
${"=".repeat(header.length)}

${meta}

Operating call: ${operatingCall}

Decision now: ${actionNow}${doNowText}

Watch:
  Flip trigger: ${flipTrigger}
  Reversal: ${reversalCondition}
  Data: ${dataFreshness}

Open full brief: ${briefUrl}
---
Whether is an operating brief for startup and product leaders, not investment advice.
Unsubscribe: {{unsubscribe_url}}
Manage preferences: {{manage_preferences_url}}`;
};