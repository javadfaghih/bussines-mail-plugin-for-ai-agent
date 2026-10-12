import type { McpServer } from "@modelcontextprotocol/server";
import type { MailAccount } from "./env";

interface Dependencies {
  hasScope(scope: string): boolean;
  mailbox(): Promise<MailAccount>;
}

/** Reveals only the current connection's saved identity and granted permissions. */
export function registerConnectionStatusTool(server: McpServer, dependencies: Dependencies) {
  server.registerTool("get_connection_status", {
    title: "Check the connected mailbox",
    description: "Show the saved mailbox email and permissions for the current authenticated connection. Use to confirm the selected account before reading mail or tracking work. Does not contact the email provider, return credentials, or prove network connectivity.",
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  }, async () => {
    try {
      if (!dependencies.hasScope("mail:read") && !dependencies.hasScope("mail:send")) {
        throw new Error("This connection has no mail permission.");
      }
      const saved = await dependencies.mailbox();
      const value = {
        connectionSaved: true,
        mailboxEmail: saved.email,
        permissions: {
          readMail: dependencies.hasScope("mail:read"),
          sendMail: dependencies.hasScope("mail:send"),
          changeFollowups: dependencies.hasScope("mail:read") && dependencies.hasScope("followups:write"),
        },
      };
      return { content: [{ type: "text" as const, text: JSON.stringify(value) }], structuredContent: value };
    } catch (cause) {
      const message = cause instanceof Error && ["Connect your mailbox first.", "This connection has no mail permission."].includes(cause.message)
        ? cause.message : "Could not read the saved connection status.";
      return { content: [{ type: "text" as const, text: message }], isError: true };
    }
  });
}
