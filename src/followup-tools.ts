import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { FollowupError, FollowupStore, createFollowupSchema, listFollowupsSchema, updateFollowupSchema } from "./followups";
import type { MailAccount } from "./env";

interface Dependencies {
  db: D1Database;
  hasScope(scope: string): boolean;
  mailbox(): Promise<MailAccount>;
  readReference(uid: number, uidValidity: string): Promise<unknown>;
  readSource(uid: number, uidValidity: string): Promise<unknown>;
}

function result(value: Record<string, unknown>) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }], structuredContent: value };
}

/** Registers the first-party work queue; private task operations never contact SMTP. */
export function registerFollowupTools(server: McpServer, dependencies: Dependencies) {
  async function run(write: boolean, operation: (store: FollowupStore) => Promise<Record<string, unknown>>) {
    try {
      if (!dependencies.hasScope("mail:read")) throw new FollowupError("This connection does not have permission to read mail or follow-ups.");
      if (write && !dependencies.hasScope("followups:write")) throw new FollowupError("Reconnect and grant followups:write permission to change your work queue.");
      const mailbox = await dependencies.mailbox();
      return result(await operation(new FollowupStore(dependencies.db, mailbox.user_id)));
    } catch (cause) {
      const message = cause instanceof FollowupError || (cause instanceof Error && cause.message === "Connect your mailbox first.")
        ? cause.message : "Could not complete the follow-up operation. Check the mailbox connection and try again.";
      return { content: [{ type: "text" as const, text: message }], isError: true };
    }
  }

  server.registerTool("create_mail_followup", {
    title: "Track work from an email",
    description: "Create a persistent private follow-up for an existing inbox message using its UID and uidValidity. Use only when the user requests tracking, with a user-agreed task title and date (YYYY-MM-DD). Checks the message exists; stores only the task and inbox reference, no email content. One follow-up per message; retries return the existing task without changing it. Maximum 200 tasks per mailbox. Does not send email or schedule notifications.",
    inputSchema: createFollowupSchema,
    annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false },
  }, async (input) => run(true, async (store) => {
    const source = await dependencies.readReference(input.uid, input.uidValidity);
    if (!source) throw new FollowupError("Source message not found. Search the inbox again before creating a follow-up.");
    return store.create(input);
  }));

  server.registerTool("list_mail_followups", {
    title: "Review the email work queue",
    description: "List saved email follow-ups across conversations, ordered by open status and due date. Returns overdue, due, upcoming, or completed buckets relative to asOf (YYYY-MM-DD; defaults to the UTC date). Supply the user's local date for today. Default is open tasks; use status=all to include completed tasks. Paginate with nextOffset when hasMore is true. Does not access the email provider or send reminders.",
    inputSchema: listFollowupsSchema,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  }, async (input) => run(false, (store) => store.list(input)));

  server.registerTool("update_mail_followup", {
    title: "Complete or reschedule email work",
    description: "Update a saved private follow-up's title, dueDate, or status (open/done) on the user's request. Requires at least one change. Completing a task records the user's decision; it does not prove an email was sent or a business outcome occurred. Does not change inbox messages.",
    inputSchema: updateFollowupSchema,
    annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: true },
  }, async (input) => run(true, (store) => store.update(input)));

  server.registerTool("delete_mail_followup", {
    title: "Delete an email follow-up",
    description: "Permanently delete one saved follow-up from this service. Obtain explicit user approval before calling. Leaves the original inbox email untouched.",
    inputSchema: { id: z.uuid() },
    annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: true },
  }, async ({ id }) => run(true, (store) => store.delete(id)));

  server.registerTool("read_followup_mail", {
    title: "Reopen the source email for a task",
    description: "Read the original inbox email linked to a saved follow-up. Checks the current inbox UIDVALIDITY before reading, so a reset inbox cannot silently substitute a different message. Returns plain text and attachment presence within the existing 256 KB limit. Missing or changed sources return an error; the saved task remains available.",
    inputSchema: { id: z.uuid() },
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  }, async ({ id }) => run(false, async (store) => {
    const followup = await store.get(id);
    const message = await dependencies.readSource(followup.source.uid, followup.source.uidValidity);
    if (!message) throw new FollowupError("Source message is no longer in the inbox. The saved follow-up is still available.");
    return { followup, message };
  }));
}
