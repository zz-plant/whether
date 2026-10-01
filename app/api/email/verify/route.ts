import { getSubscriberStore } from "../../../../lib/email/subscriberStore";
import { confirmationLead, describeConfirmation, describeSubscription } from "../../../../lib/email/subscriptionFlow";
import { ACTION_HOME_LINK, actionForm, actionPage, actionParagraph, postedToken } from "../../../../lib/email/actionPage";

export const runtime = "edge";

/*
 * Opening the link shows what it would change; only the button changes it.
 *
 * Until 2026-10-02 a GET applied the change. Mail filters that open every link to
 * scan it (Outlook Safe Links, Proofpoint) would then confirm a change on behalf of
 * a reader who never saw it, which defeats holding a change for the inbox at all.
 */

/* It does not say "use the newest email": the request that retired this link may
   be someone else's, and the newest email describes theirs. */
const DEAD_LINK =
  "This link has expired, was already used, or was replaced by a newer request for this address. If a newer email arrived, check it describes what you asked for before confirming; if you still want this change, ask again from whether.work.";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return actionPage("Link incomplete", actionParagraph("This confirmation link is missing its code. Open it from the email again."), 400);

  const pending = await getSubscriberStore().getPendingConfirmation(token);
  const confirmation = pending ? describeConfirmation(pending) : null;
  if (!confirmation) return actionPage("Link no longer works", actionParagraph(DEAD_LINK) + ACTION_HOME_LINK, 410);

  return actionPage(
    confirmation.kind === "subscribe" ? "Confirm your subscription" : "Confirm a change",
    actionParagraph(confirmationLead(confirmation)) + actionForm("/api/email/verify", token, "Confirm"),
  );
}

export async function POST(request: Request) {
  const token = await postedToken(request);
  if (!token) return actionPage("Link incomplete", actionParagraph("This confirmation is missing its code. Open the link from the email again."), 400);

  try {
    const confirmed = await getSubscriberStore().verifyEmail(token);
    if (!confirmed) return actionPage("Link no longer works", actionParagraph(DEAD_LINK) + ACTION_HOME_LINK, 410);
    const standing = confirmed.active
      ? `This address now gets ${describeSubscription({ ...confirmed, pendingPlanLines: confirmed.planLines })}.`
      : "Nothing is sent to this address.";
    return actionPage("Confirmed", actionParagraph(`${standing} Every email carries a link to unsubscribe.`) + ACTION_HOME_LINK);
  } catch {
    return actionPage("Something went wrong", actionParagraph("The confirmation did not go through. Try the link again in a minute.") + ACTION_HOME_LINK, 500);
  }
}
