import { redirectLegacyAnswer } from "../../lib/navigation/legacyRedirects";

export const revalidate = 900;

export default function LegacyAnswerRoute() {
  redirectLegacyAnswer("is-it-risk-on-or-risk-off-for-startups");
}
