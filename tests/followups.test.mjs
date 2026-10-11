import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { registerHooks } from "node:module";

registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith(".") && context.parentURL?.endsWith(".ts") && !/\.[a-z]+$/.test(specifier)) specifier += ".ts";
  return next(specifier, context);
} });
const { FollowupStore, FollowupError, createFollowupSchema, updateFollowupSchema } = await import("../src/followups.ts");
const { registerFollowupTools } = await import("../src/followup-tools.ts");

function setup() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  for (const name of ["0001_initial.sql", "0002_mail_followups.sql"]) sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8"));
  for (const id of ["alice", "bob"]) sqlite.prepare("INSERT INTO mail_accounts(user_id,email,imap_host,smtp_host,encrypted_password) VALUES (?,?,?,?,?)")
    .run(id, `${id}@example.com`, "imap.example.com", "smtp.example.com", "test-ciphertext");
  const db = { prepare(sql) { return { bind(...args) {
    const query = sqlite.prepare(sql);
    return {
      async first() { return query.get(...args) ?? null; },
      async all() { return { results: query.all(...args) }; },
    };
  } }; } };
  return { sqlite, db, alice: new FollowupStore(db, "alice"), bob: new FollowupStore(db, "bob") };
}
const input = { uid: 42, uidValidity: "123", title: "Confirm the delivery date", dueDate: "2026-10-11" };

test("work survives a new conversation and duplicates do not overwrite user choices", async () => {
  const { alice, db } = setup();
  const first = await alice.create(input);
  assert.equal(first.created, true);
  const again = await new FollowupStore(db, "alice").create({ ...input, title: "Changed title", dueDate: "2027-01-01" });
  assert.equal(again.created, false);
  assert.equal(again.followup.id, first.followup.id);
  assert.equal(again.followup.title, input.title);
  assert.equal(again.followup.dueDate, input.dueDate);
});

test("cross-mailbox reads, updates, and deletes reveal no other user's task", async () => {
  const { alice, bob } = setup();
  const { followup } = await alice.create(input);
  assert.equal((await bob.list({})).total, 0);
  await assert.rejects(bob.get(followup.id), /not found/);
  await assert.rejects(bob.update({ id: followup.id, status: "done" }), /not found/);
  await assert.rejects(bob.delete(followup.id), /not found/);
  assert.equal((await alice.get(followup.id)).status, "open");
});

test("due buckets, completion, reopening, rescheduling, and pagination use explicit date", async () => {
  const { alice } = setup();
  for (const [uid, dueDate] of [[1,"2026-10-10"],[2,"2026-10-11"],[3,"2026-10-12"]]) await alice.create({ ...input, uid, dueDate });
  const page = await alice.list({ asOf: "2026-10-11", limit: 2 });
  assert.deepEqual(page.followups.map((task) => task.bucket), ["overdue", "due"]);
  assert.equal(page.hasMore, true);
  const last = await alice.list({ asOf: "2026-10-11", offset: page.nextOffset });
  assert.equal(last.followups[0].bucket, "upcoming");
  assert.equal(last.hasMore, false);
  const id = page.followups[0].id;
  await alice.update({ id, status: "done" });
  assert.equal((await alice.list({ status: "done", asOf: "2026-10-11" })).followups[0].bucket, "completed");
  await alice.update({ id, status: "open", dueDate: "2026-10-14" });
  assert.equal((await alice.list({ asOf: "2026-10-11" })).followups.at(-1).dueDate, "2026-10-14");
});

test("removing a mailbox deletes the private queue; deleting a task preserves the mailbox", async () => {
  const { alice, sqlite } = setup();
  const { followup } = await alice.create(input);
  assert.deepEqual(await alice.delete(followup.id), { deleted: true, id: followup.id });
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS total FROM mail_accounts").get().total, 2);
  await alice.create(input);
  sqlite.prepare("DELETE FROM mail_accounts WHERE user_id=?").run("alice");
  assert.equal((await alice.list({})).total, 0);
});

test("200-task capacity still allows idempotent retry and frees capacity on deletion", async () => {
  const { alice } = setup();
  for (let uid = 1; uid <= 200; uid++) await alice.create({ ...input, uid });
  assert.equal((await alice.create(input)).created, false);
  await assert.rejects(alice.create({ ...input, uid: 201 }), /limit reached/);
  const { followups } = await alice.list({ limit: 1 });
  await alice.delete(followups[0].id);
  assert.equal((await alice.create({ ...input, uid: 201 })).created, true);
});

test("empty titles, impossible dates, invalid source IDs, and empty updates are rejected", () => {
  for (const change of [{ title: "  " },{ dueDate: "2026-02-30" },{ uid: 0 },{ uidValidity: "bad" }]) assert.equal(createFollowupSchema.safeParse({ ...input, ...change }).success, false);
  assert.equal(updateFollowupSchema.safeParse({ id: crypto.randomUUID() }).success, false);
});

function toolSetup(scopes = ["mail:read", "followups:write"]) {
  const { db, alice, sqlite } = setup();
  const tools = new Map();
  const calls = [];
  registerFollowupTools({ registerTool(name, metadata, handler) { tools.set(name, { metadata, handler }); } }, {
    db, hasScope: (scope) => scopes.includes(scope),
    async mailbox() { calls.push("mailbox"); return { user_id: "alice" }; },
    async readReference(uid, validity) { calls.push(["reference", uid, validity]); return { uid }; },
    async readSource(uid, validity) { calls.push(["source", uid, validity]); return { uid, text: "test source" }; },
  });
  return { tools, calls, alice, sqlite };
}

test("the workflow checks source provenance, persists a task, reopens it, and completes it", async () => {
  const { tools, calls } = toolSetup();
  const created = await tools.get("create_mail_followup").handler(input);
  assert.equal(created.structuredContent.created, true);
  const id = created.structuredContent.followup.id;
  const source = await tools.get("read_followup_mail").handler({ id });
  assert.equal(source.structuredContent.message.text, "test source");
  assert.deepEqual(calls.filter(Array.isArray), [["reference",42,"123"],["source",42,"123"]]);
  await tools.get("update_mail_followup").handler({ id, status: "done" });
  const queue = await tools.get("list_mail_followups").handler({ status: "done" });
  assert.equal(queue.structuredContent.followups[0].status, "done");
  assert.equal(JSON.stringify(created).includes("test source"), false);
});

test("read-only grants cannot mutate tasks and no mail scope cannot read the queue", async () => {
  for (const name of ["create_mail_followup", "update_mail_followup", "delete_mail_followup"]) {
    const { tools, calls } = toolSetup(["mail:read"]);
    const response = await tools.get(name).handler(input);
    assert.equal(response.isError, true);
    assert.match(response.content[0].text, /followups:write/);
    assert.deepEqual(calls, []);
  }
  const { tools, calls } = toolSetup([]);
  assert.equal((await tools.get("list_mail_followups").handler({})).isError, true);
  assert.deepEqual(calls, []);
});

test("a removed connection fails without revealing tasks or contacting the mail provider", async () => {
  // A real mailbox lookup throws when absent; check the same boundary through registration.
  const registry = new Map();
  registerFollowupTools({ registerTool(name, _, handler) { registry.set(name, handler); } }, {
    db: {}, hasScope: () => true,
    async mailbox() { throw new Error("Connect your mailbox first."); },
    async readReference() { assert.fail("Must not read mail"); },
    async readSource() { assert.fail("Must not read mail"); },
  });
  assert.match((await registry.get("list_mail_followups")({})).content[0].text, /Connect your mailbox first/);
});

test("real MCP transport advertises every workflow tool and validates arguments before writes", async () => {
  const { McpServer } = await import("@modelcontextprotocol/server");
  const { Client, InMemoryTransport } = await import("@modelcontextprotocol/client");
  const { db, alice } = setup();
  let referenceCalls = 0;
  const server = new McpServer({ name: "Workflow test", version: "0.3.0" });
  registerFollowupTools(server, {
    db, hasScope: () => true, async mailbox() { return { user_id: "alice" }; },
    async readReference() { referenceCalls++; return { uid: 42 }; },
    async readSource() { return { text: "fixture" }; },
  });
  const client = new Client({ name: "Test client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const listed = await client.listTools();
    assert.equal(listed.tools.length, 5);
    for (const tool of listed.tools) {
      assert.equal(tool.inputSchema.type, "object");
      for (const key of ["readOnlyHint", "destructiveHint", "openWorldHint"]) assert.equal(typeof tool.annotations[key], "boolean");
    }
    const created = await client.callTool({ name: "create_mail_followup", arguments: input });
    assert.equal(created.structuredContent.created, true);
    const badDate = await client.callTool({ name: "create_mail_followup", arguments: { ...input, dueDate: "2026-02-30" } });
    assert.equal(badDate.isError, true);
    const emptyUpdate = await client.callTool({ name: "update_mail_followup", arguments: { id: created.structuredContent.followup.id } });
    assert.equal(emptyUpdate.isError, true);
    assert.equal(referenceCalls, 1);
    assert.equal((await alice.list({})).total, 1);
  } finally {
    await client.close();
    await server.close();
  }
});

test("source validation failures do not create tasks or expose server exceptions", async () => {
  const { db, alice } = setup();
  for (const failure of [null, new FollowupError("Inbox identity changed."), new Error("secret server detail")]) {
    const registry = new Map();
    registerFollowupTools({ registerTool(name, _, handler) { registry.set(name, handler); } }, {
      db, hasScope: () => true, async mailbox() { return { user_id: "alice" }; },
      async readReference() { if (failure instanceof Error) throw failure; return failure; },
      async readSource() { assert.fail("Must not read body"); },
    });
    const response = await registry.get("create_mail_followup")(input);
    assert.equal(response.isError, true);
    assert.equal(JSON.stringify(response).includes("secret server detail"), false);
    assert.equal((await alice.list({})).total, 0);
  }
});
