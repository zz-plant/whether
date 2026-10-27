/**
 * This week's brief as a question to a general assistant: Claude, ChatGPT, or
 * Perplexity, opened with a prompt that names the brief's address and asks the
 * assistant to apply it to the reader's company.
 *
 * The brief answers for every company at once; the stage and runway calibration
 * on the site is coarse by design. An assistant that has read the brief can take
 * the reader's own numbers, and the prompt asks it to ask for them rather than
 * guess, and to quote the brief's lines rather than restate them, so what comes
 * back is the brief's guidance applied, not a second opinion wearing its name.
 *
 * Each link is the assistant's own public prefill (`?q=`); nothing is sent until
 * the reader presses enter there.
 */
type AssistantLink = { name: string; href: string };

export const buildAssistantPrompt = (briefUrl: string, weekLabel: string) =>
  [
    `Read Whether's weekly operating guidance for startups for the week of ${weekLabel}: ${briefUrl}`,
    "Then ask me for my company's stage, monthly burn, and months of runway, and tell me what the guidance means for my hiring, spending, and fundraising this week.",
    "Quote its pause and resume lines exactly where they apply, and say which of my plans sits on the wrong side of one.",
  ].join(" ");

export const buildAssistantLinks = (briefUrl: string, weekLabel: string): AssistantLink[] => {
  const q = encodeURIComponent(buildAssistantPrompt(briefUrl, weekLabel));
  return [
    { name: "Claude", href: `https://claude.ai/new?q=${q}` },
    { name: "ChatGPT", href: `https://chatgpt.com/?q=${q}` },
    { name: "Perplexity", href: `https://www.perplexity.ai/search?q=${q}` },
  ];
};
