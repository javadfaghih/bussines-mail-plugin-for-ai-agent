# Remediation of the v0.2.0 rejection

OpenAI rejected the plugin because it primarily exposed third-party integration
access without a distinct workflow. v0.3.0 adds application-owned task state and
an email-to-work lifecycle. Renaming the plugin or adding an AI summary alone
would not address this reason.

| Before | Implemented in v0.3.0 |
| --- | --- |
| List, search, read, and send mail | Create work from a verified email with an agreed title and due date |
| Results only in the current exchange | Persist the private queue in D1 across conversations |
| No task state | Review overdue/due/upcoming work; complete, reopen, reschedule, or delete |
| Numeric UID only | Check INBOX UIDVALIDITY before reopening a saved source |
| Mail-access listing | Workflow listing, starter prompts, bundled skill, and five positive/three negative cases |

The existing identity and endpoint are preserved. Five individually exposed
tools implement the task lifecycle. Listing, updating, and deleting tasks do
not contact the email provider. Creation checks only source headers; reopening
fetches plain text within the existing size limit. Tasks are isolated by mailbox,
creation retries are idempotent, and removing the mailbox removes its queue.

Consent and privacy source disclose persistent task titles, dates, status,
timestamps, references, retention, and deletion. Changes require the new
`followups:write` scope plus `mail:read`; old grants do not silently gain access.
All tools declare readOnlyHint, destructiveHint, and openWorldHint. Instructions
preserve exact-message approval for sending and treat email as untrusted data.

## Review note

Use this note only after deploying and verifying the matching version. Do not
claim deployment, demo coverage, or passed host tests prematurely:

> Version 0.3.0 adds an email follow-up workflow owned by this service. Users
> convert an inbox message into a persistent task, set its due date, resume the
> queue in a new conversation, reopen the verified source email, and complete
> or reschedule the work. Task state lives in our application database rather
> than being relayed from an email provider. Review cases and the new walkthrough
> focus on this end-to-end behavior. No background scanning, automatic reminders,
> or unapproved sending is offered.

## Release sequence

1. Review the diff and authorize the production update. Apply migration 0002 to
   the existing D1 binding before deploying Worker v0.3.0. Preserve secrets and
   the endpoint; independently verify the new tools and updated public pages.
2. Reconnect a dedicated fixture mailbox with task permission in ChatGPT or
   Codex, run the workflow, and record and verify the new demo. Keep credentials
   and customer data off-screen. No real sends are needed.
3. Add the actual recording URL to `review.demo_recording_url`, rebuild the ZIP,
   and inspect the rejected submission before replacing its entire package.
   Preserve publisher, connections, audience, and country targeting.
4. Run all eight cases against the saved version. Complete authorized developer
   attestations and required scans, then submit when authorized. Publication
   requires separate approval after OpenAI review.

OpenAI may still request changes; this does not guarantee approval.

## Dependency check

The existing lockfile reports seven high-severity npm audit entries in MCP
client/SDK and Wrangler dependency chains. These predate this change. No forced
SDK downgrade or unrelated runtime upgrade was applied. Review compatible
patches before production release; passing local tests does not clear advisories.

Authoritative references checked October 11, 2026:

- [Plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines)
- [MCP review requirements](https://developers.openai.com/plugins/deploy/app-review)
- [Upload and submit](https://developers.openai.com/plugins/deploy/submission)
