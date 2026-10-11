import assert from "node:assert/strict";
import { test } from "node:test";
import { registerHooks } from "node:module";
import { state } from "./fixtures/imap.mjs";

registerHooks({ resolve(specifier, context, next) {
  if (specifier === "imapflow" || (specifier === "./smtp" && context.parentURL?.endsWith("/src/mail.ts"))) {
    return next(new URL("./fixtures/imap.mjs", import.meta.url).href, context);
  }
  if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts") && !/\.[a-z]+$/.test(specifier)) specifier += ".ts";
  return next(specifier, context);
} });
const { getMail, getMailReference } = await import("../src/mail.ts");
const mailbox = { email: "fixture@example.com", imap_host: "imap.example.com" };

test("UIDVALIDITY mismatch stops a source read before fetching any message", async () => {
  state.calls = [];
  await assert.rejects(getMail(mailbox, "fixture", 42, "999"), /inbox identity changed/);
  await assert.rejects(getMailReference(mailbox, "fixture", 42, "999"), /inbox identity changed/);
  assert.deepEqual(state.calls, []);
});

test("a valid source reference checks only headers and returns mailbox provenance", async () => {
  state.calls = [];
  const reference = await getMailReference(mailbox, "fixture", 42, "123");
  assert.equal(reference.uidValidity, "123");
  assert.equal(reference.uid, 42);
  assert.equal(state.calls.length, 1);
  assert.equal(state.calls[0].query.source, undefined);
  assert.deepEqual(state.calls[0].options, { uid: true });
});

test("source reading preserves the size limit and handles missing sources", async () => {
  state.calls = [];
  const message = await getMail(mailbox, "fixture", 42, "123");
  assert.match(message.error, /256 KB/);
  assert.equal(state.calls.length, 1);
  state.exists = false;
  try { assert.equal(await getMailReference(mailbox, "fixture", 42, "123"), null); }
  finally { state.exists = true; }
});
