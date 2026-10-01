import { getSubscriberStore } from "../../../../lib/email/subscriberStore";
import { describeSubscription } from "../../../../lib/email/subscriptionFlow";
import { ACTION_HOME_LINK, actionForm, actionPage, actionParagraph, postedToken } from "../../../../lib/email/actionPage";

export const runtime = "edge";

/*
 * Opening the footer link says what stops; only the button stops it.
 *
 * Until 2026-10-02 the GET unsubscribed. Every Monday brief and alert carries
 * this link, and mail filters that open every link to scan it (Outlook Safe
 * Links, Proofpoint) would unsubscribe a reader on delivery, with nothing to
 * tell them their next brief was not coming.
 */

const UNKNOWN_LINK =
  "This link does not match a Whether subscription. If you still get emails from Whether, use the link at the bottom of the newest one.";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return actionPage("Link incomplete", actionParagraph("This unsubscribe link is missing its code. Open it from the email again."), 400);

  const subscriber = await getSubscriberStore().getSubscriberByToken(token);
  if (!subscriber) return actionPage("Link not recognised", actionParagraph(UNKNOWN_LINK) + ACTION_HOME_LINK, 404);
  if (!subscriber.active) {
    return actionPage("Already unsubscribed", actionParagraph("Whether sends nothing to this address.") + ACTION_HOME_LINK);
  }

  const stops = describeSubscription({ ...subscriber, pendingPlanLines: subscriber.planLines });
  return actionPage(
    "Unsubscribe from Whether?",
    actionParagraph(`This stops every email Whether sends to this address, including ${stops}.`)
      + actionForm("/api/email/unsubscribe", token, "Unsubscribe"),
  );
}

/* The page's button posts the token in the form. A mail client's one-click
   unsubscribe (RFC 8058) posts `List-Unsubscribe=One-Click` to the link itself,
   so the token is in the query string then. */
export async function POST(request: Request) {
  const token = (await postedToken(request)) ?? new URL(request.url).searchParams.get("token");
  if (!token) return actionPage("Link incomplete", actionParagraph("This unsubscribe request is missing its code. Open the link from the email again."), 400);

  try {
    const left = await getSubscriberStore().unsubscribe(token);
    if (!left) return actionPage("Link not recognised", actionParagraph(UNKNOWN_LINK) + ACTION_HOME_LINK, 404);
    return actionPage(
      "Unsubscribed",
      actionParagraph("Whether will not email this address again. To start again, subscribe from whether.work; this inbox will be asked to confirm.")
        + ACTION_HOME_LINK,
    );
  } catch {
    return actionPage("Something went wrong", actionParagraph("The unsubscribe did not go through. Try the link again in a minute.") + ACTION_HOME_LINK, 500);
  }
}
