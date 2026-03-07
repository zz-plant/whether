import { redirect } from "next/navigation";

export const revalidate = 900;

export default function LegacyAnswerRoute() {
  redirect("/answers/how-to-operate-in-expansion-mode-startup");
}
