# Objections ledger

Copy answers an objection only when a visitor has raised it. The answer goes where the
question is asked (an FAQ entry, or beside the control it concerns), never in a hero, an
intro, a lede or a meta description. Copy that presupposes a doubt the reader may not have
("you might be wondering", "don't worry", "no hidden fees", "not another dashboard", "unlike
other tools") states what the thing does instead, answer first. A required disclosure (not
advice, illustrative figures, a data limit that changes what a number means) stays, stated
once and plainly, after the answer.

This is a canonical doc. The patterns live in `tests/fixtures/presupposedObjections.ts`, and
`tests/readerVocabulary.test.tsx`, `tests/readerClauseShapes.test.tsx` and
`tests/contentVocabulary.test.ts` apply them to the rendered routes, the share formats and the
`content/` and `public/downloads/` files. A sentence that answers an objection listed below
passes when `OBJECTION_ALLOWANCES` in that fixture names its surface, its text and the
objection's id; an allowance that names an id missing from this table fails the test.

Evidence is where and when a visitor raised the objection: an issue a reader opened, a
suggestion or reply they sent, a support note, or interview notes that record their words. An
objection a launch kit, a sales script or a review expected (`docs/launch/show-hn.md`,
`docs/sales-competitive-messaging.md`) is a guess about a visitor and does not count.

| id | Objection, as a visitor put it | Evidence | Where the copy answers it |
| --- | --- | --- | --- |

Add an objection only with its evidence. As of 2026-11-17 none has been recorded: the repo's
issues are the owner's specs, and the objections in the launch and sales docs were anticipated,
not heard.
