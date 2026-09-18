import { issueClientToken } from "../lib/api/clientToken";

/**
 * Mint a ledger client token for an integrator.
 *
 * Deliberately a script and not an endpoint. A public `POST /token` would let
 * anyone mint a signature for any id, which is the hole this closes rather than
 * a way through it — the token means something precisely because issuing one
 * requires the server secret, and the only people who hold that are the people
 * who run the deployment.
 *
 * So the flow is out of band, like an API key: an integrator who needs their
 * ledger writes attributed to a named human asks for a token, an operator runs
 * this, and the integrator sends it as `x-whether-client-token` alongside their
 * `x-whether-client-id`. Everyone else keeps writing unattested records, which
 * still land in the ledger — they are just recorded as the service acting, which
 * is what actually happened.
 *
 *   WHETHER_LEDGER_SECRET=… bun scripts/issue-ledger-token.ts <client-id>
 */
const clientId = process.argv[2]?.trim();

if (!clientId) {
  console.error("usage: bun scripts/issue-ledger-token.ts <client-id>");
  process.exit(1);
}

if (clientId.length < 3 || clientId.length > 128) {
  console.error("client id must be 3-128 characters, matching what the API accepts");
  process.exit(1);
}

const token = await issueClientToken(clientId);

if (!token) {
  console.error(
    "WHETHER_LEDGER_SECRET is unset or shorter than 16 characters, so nothing can be signed.\n"
    + "Until it is set, every ledger write is recorded as unverified — which is the safe\n"
    + "state, not a broken one: no record claims a human actor the server cannot vouch for.",
  );
  process.exit(1);
}

console.log(token);
