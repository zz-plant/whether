import { redirect } from "next/navigation";

export const revalidate = 900;

export default function LegacyAnswerRoute() {
  redirect("/answers/is-it-risk-on-or-risk-off-for-startups");
}
