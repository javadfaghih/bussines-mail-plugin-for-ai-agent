import assert from "node:assert/strict";
import { test } from "node:test";
import { registerConnectionStatusTool } from "../src/connection-status-tools.ts";

function setup(scopes, mailbox) {
  let handler;
  let metadata;
  registerConnectionStatusTool({ registerTool(_name, info, callback) { metadata = info; handler = callback; } }, {
    hasScope: scope => scopes.includes(scope), mailbox,
  });
  return { handler, metadata };
}

test("connection identity never forwards credentials, provider hosts, or internal IDs", async () => {
  const saved = { user_id: "private-id", email: "fixture@example.com", imap_host: "private-imap", smtp_host: "private-smtp", encrypted_password: "private-ciphertext", password: "private-password" };
  const { handler, metadata } = setup(["mail:read", "mail:send", "followups:write"], async () => saved);
  const response = await handler();
  assert.deepEqual(response.structuredContent, { connectionSaved: true, mailboxEmail: saved.email, permissions: { readMail: true, sendMail: true, changeFollowups: true } });
  for (const secret of [saved.user_id, saved.imap_host, saved.smtp_host, saved.encrypted_password, saved.password]) assert.equal(JSON.stringify(response).includes(secret), false);
  assert.deepEqual(metadata.annotations, { readOnlyHint: true, openWorldHint: false, destructiveHint: false });
});

test("a connection without mail grants cannot look up mailbox identity", async () => {
  const { handler } = setup([], async () => assert.fail("Must not query the mailbox"));
  assert.equal((await handler()).isError, true);
});

test("send-only and read-only connections cannot claim follow-up write access", async () => {
  for (const scopes of [["mail:send", "followups:write"], ["mail:read"]]) {
    const { handler } = setup(scopes, async () => ({ email: "fixture@example.com" }));
    assert.equal((await handler()).structuredContent.permissions.changeFollowups, false);
  }
});

test("unexpected database exceptions are redacted", async () => {
  const { handler } = setup(["mail:read"], async () => { throw new Error("private database detail"); });
  const response = await handler();
  assert.equal(response.isError, true);
  assert.equal(JSON.stringify(response).includes("private database detail"), false);
});
