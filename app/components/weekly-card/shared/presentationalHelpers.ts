export const compactActionCue = (text: string) =>
  text
    .replace(/^(Pause|Resume)\s+/i, "")
    .replace(/\.$/, "")
    .replace(/^when\s+/i, "")
    .trim();

export const compactRoleCue = (text: string) =>
  text
    .replace(/\s+/g, " ")
    .replace(/\.\s+/g, "; ")
    .replace(/;\s*$/, "")
    .trim();
