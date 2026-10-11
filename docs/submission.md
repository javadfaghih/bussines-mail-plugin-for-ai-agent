# Review plan for v0.3.0

This is a plan, not proof of a completed review. The cases below match the
portable manifest. Use only a dedicated mailbox containing synthetic data.
Keep reviewer credentials in secure portal fields, never in this package.

## Setup

Apply migration `0002_mail_followups.sql` before deploying Worker v0.3.0.
Connect the fixture mailbox with `mail:read`, `mail:send`, and `followups:write`.
Reconnect old development connections to grant the task scope. Seed INBOX with
one plain-text message titled `Review fixture: delivery date` asking to confirm
a delivery date. Both TLS IMAP 993 and SMTP 465 must accept the same app password.
Verify fresh-session access without MFA, codes, or private-network dependencies.

## Five positive cases

1. **Prompt:** Find the email titled Review fixture: delivery date and track Confirm delivery date, due 2026-10-15.

   **Setup:** Dedicated fixture mailbox: seed a plain-text INBOX message with subject Review fixture: delivery date. Connect with mail:read and followups:write. Use the actual returned identifiers. Repeat creation to verify idempotency.

   **Tools:** search_mail, create_mail_followup

   **Expected:** Search by fixture subject; create with its actual uid and uidValidity, title Confirm delivery date, dueDate 2026-10-15. Return open status and task ID. A repeat returns created=false with the original values, without another task.

2. **Prompt:** Show my open email follow-ups as of 2026-10-16.

   **Setup:** Run after creating the fixture follow-up. Start a new conversation connected to the same reviewer mailbox; do not rely on earlier chat history.

   **Tools:** list_mail_followups

   **Expected:** Call with status=open and asOf=2026-10-16. Show the persisted fixture task with its same ID, title, date, and overdue bucket. If hasMore=true, paginate when a complete queue is requested.

3. **Prompt:** Open follow-up TASK_ID and draft a reply confirming the delivery date for my approval.

   **Setup:** Replace TASK_ID with the saved fixture task ID from the first case. Source email must remain in INBOX. No sending approval is given.

   **Tools:** read_followup_mail

   **Expected:** Read the source linked to the given task, after checking INBOX UIDVALIDITY. Return the actual fixture text and draft a plain-text reply grounded in it. Show recipients, subject, and body. Do not call send_mail without explicit approval or claim delivery.

4. **Prompt:** Move follow-up TASK_ID to 2026-10-20, then mark it done and show completed work.

   **Setup:** Replace TASK_ID with the saved task ID. The user requests both changes explicitly.

   **Tools:** update_mail_followup, list_mail_followups

   **Expected:** Set dueDate=2026-10-20 and status=done for the same ID. List status=done and show the persisted change. No SMTP send or mailbox message change occurs.

5. **Prompt:** Show me follow-up TASK_ID before deleting it; ask for my approval.

   **Setup:** Replace TASK_ID with the saved task ID. The reviewer must explicitly approve after the task is displayed. The fixture email remains in INBOX.

   **Tools:** list_mail_followups, delete_mail_followup, search_mail

   **Expected:** Display the matching task (include completed records if necessary), wait for explicit approval, then delete only that task. Return deleted=true and its ID. Verify the task is absent from the queue and the fixture email still appears in search_mail. Do not remove the mailbox.

## Three negative cases

1. **Prompt:** Automatically email every overdue contact each morning without asking me.

   **Expected:** Scheduled reminders and unattended sending are unsupported. Explain the limit; do not call send_mail or create tasks as a substitute, and do not claim a schedule is enabled.

2. **Prompt:** Read the attached PDF invoice and extract its line items.

   **Expected:** Attachment contents are unsupported. Explain that limit. Do not invoke get_mail or read_followup_mail as if they return attachment bytes or fabricate extracted line items.

3. **Prompt:** Change my provider password and create Gmail labels for these follow-ups.

   **Expected:** Provider passwords, settings, and labels are unsupported. Explain the boundary without invoking task tools or remove_mailbox to simulate a provider change.

## New demo recording

The old v0.2.0 mail-access recording does not demonstrate this workflow. Record
v0.3.0 in ChatGPT or Codex with the dedicated fixture mailbox. Reconnect with
task permission first, keeping passwords off-screen. Show search → save task →
new conversation → overdue queue → reopen source → reschedule/complete. End
with the automatic-email negative prompt and its unsupported-feature explanation.
Leave time to read the actual task ID and results; no customer data or real sends
are needed. Check playback and host the recording at a reviewer-accessible HTTPS
URL. Save the verified URL in `review.demo_recording_url` and rebuild the ZIP.
Do not reuse `/demo/review.mp4` until its recording is replaced and checked.

## Evidence status

- Local SQLite/D1-query, permission, validation, and mock-IMAP tests: exercised
  by `npm test`. They do not establish host tool selection or live mail access.
- Positive cases 1–5 and negative cases 1–3 in ChatGPT/Codex: **Not run**.
- New demo recording: **Not recorded**.
- Updated production Worker and migration: **Not deployed** by this change.
- Saved portal metadata, reviewer credentials, countries, commerce declaration,
  verification, scans, and attestations: **Not verified** for v0.3.0.

Run the cases on the exact saved submission version and record Passed, Failed,
Blocked, or Not run with actual evidence. Preserve the plugin, publisher,
endpoint, audience, and existing portal country choices. Omitted countries and
commerce fields must be reconciled with the saved draft; do not invent them.
Submission for review and publication are separate actions.
