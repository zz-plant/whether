# Whether for Claude

Whether is weekly operating guidance for startup leaders. It reads U.S. interest rates and credit
markets every day and publishes, each Monday, which of hiring, spending, fundraising and expansion
to pause or resume, with the lines that would change the call.

This plugin gives Claude that call when you ask about timing a decision: "should we freeze
hiring?", "is now a good time to raise a seed round?", "do we need to cut burn?", or "what market
context goes in this board update?".

## What it adds

- **The Whether connector**, the remote MCP server at `https://whether.work/api/mcp`. Every tool
  only reads. No account or key.
- **The `hire-raise-spend` skill**, which tells Claude when the call applies, which tool to call,
  and how to apply the published call to your company's runway and stage.

## Install

In Claude Code:

```bash
claude plugin install whether --marketplace zz-plant/whether
```

Inside a session, `/plugin install whether --marketplace zz-plant/whether` does the same.
The shell command requires Claude Code v2.1.292 or later; the session command requires v2.1.275
or later. On earlier versions, add the marketplace first with
`claude plugin marketplace add zz-plant/whether`, then install `whether@whether`.

To try this checkout before publishing the marketplace, start Claude Code from the repository root:

```bash
claude --plugin-dir ./plugins/whether
```

Or add the connector alone in any MCP client: `https://whether.work/api/mcp`.

## What it sends and fetches

- Tool calls go to `https://whether.work/api/mcp`. Their arguments, such as the question you
  asked or the plan text you want checked, are sent there to compute the answer.
- Without the connector, the skill fetches `https://whether.work/api/agent?view=state` and
  `https://whether.work/api/mcp?tool=...` instead.
- The plugin bundles no hooks or local scripts. See the [privacy policy](https://whether.work/privacy).

## Limits

Whether reads public market data and knows nothing about your company's numbers. The call is the
same for every company until you apply it to your runway and stage. It is informational, not
investment, legal, tax or employment advice.

The skill should apply to "should we hire a second engineer in this market?" and "what market
context belongs in our board update?" It should not apply to "which stocks should I buy?" or
"which engineering candidate should we hire?".

Documentation: [whether.work/api-docs](https://whether.work/api-docs). Source:
[github.com/zz-plant/whether](https://github.com/zz-plant/whether). License: MIT.
