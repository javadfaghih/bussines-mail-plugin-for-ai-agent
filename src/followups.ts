import { z } from "zod";

export const sourceSchema = {
  uid: z.number().int().positive(),
  uidValidity: z.string().regex(/^[1-9]\d{0,9}$/),
};
export const createFollowupSchema = z.object({
  ...sourceSchema,
  title: z.string().trim().min(1).max(200),
  dueDate: z.iso.date(),
});
export const updateFollowupSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  dueDate: z.iso.date().optional(),
  status: z.enum(["open", "done"]).optional(),
}).refine((input) => input.title !== undefined || input.dueDate !== undefined || input.status !== undefined, {
  message: "Provide a title, dueDate, or status to update.",
});
export const listFollowupsSchema = z.object({
  status: z.enum(["open", "done", "all"]).default("open"),
  asOf: z.iso.date().optional(),
  limit: z.number().int().min(1).max(100).default(30),
  offset: z.number().int().min(0).max(200).default(0),
});

export class FollowupError extends Error {}

interface FollowupRow {
  id: string;
  source_uid: number;
  source_uid_validity: string;
  title: string;
  due_date: string;
  status: "open" | "done";
  created_at: string;
  updated_at: string;
}

const columns = "id,source_uid,source_uid_validity,title,due_date,status,created_at,updated_at";

function present(row: FollowupRow, asOf: string) {
  return {
    id: row.id,
    source: { folder: "INBOX", uid: row.source_uid, uidValidity: row.source_uid_validity },
    title: row.title,
    dueDate: row.due_date,
    status: row.status,
    bucket: row.status === "done" ? "completed" : row.due_date < asOf ? "overdue" : row.due_date === asOf ? "due" : "upcoming",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Stores user-requested work independently of the email provider. Never stores message bodies. */
export class FollowupStore {
  private db: D1Database;
  private userId: string;

  constructor(db: D1Database, userId: string) {
    this.db = db;
    this.userId = userId;
  }

  async get(id: string) {
    const row = await this.db.prepare(`SELECT ${columns} FROM mail_followups WHERE user_id=? AND id=?`)
      .bind(this.userId, id).first<FollowupRow>();
    if (!row) throw new FollowupError("Follow-up not found in this mailbox.");
    return present(row, new Date().toISOString().slice(0, 10));
  }

  async create(input: z.infer<typeof createFollowupSchema>) {
    const value = createFollowupSchema.parse(input);
    const now = new Date().toISOString();
    // One task per inbox reference makes repeated tool calls safe. The capacity check is atomic.
    const row = await this.db.prepare(`INSERT INTO mail_followups
      (id,user_id,source_uid,source_uid_validity,title,due_date,created_at,updated_at)
      SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM mail_followups WHERE user_id=?) < 200
      ON CONFLICT(user_id,source_uid_validity,source_uid) DO NOTHING RETURNING ${columns}`)
      .bind(crypto.randomUUID(), this.userId, value.uid, value.uidValidity, value.title, value.dueDate, now, now, this.userId)
      .first<FollowupRow>();
    if (row) return { created: true, followup: present(row, now.slice(0, 10)) };
    const existing = await this.db.prepare(`SELECT ${columns} FROM mail_followups WHERE user_id=? AND source_uid_validity=? AND source_uid=?`)
      .bind(this.userId, value.uidValidity, value.uid).first<FollowupRow>();
    if (existing) return { created: false, followup: present(existing, now.slice(0, 10)) };
    throw new FollowupError("Follow-up limit reached (200 per mailbox). Delete an old follow-up before adding another.");
  }

  async list(input: z.input<typeof listFollowupsSchema>) {
    const { status, asOf = new Date().toISOString().slice(0, 10), limit, offset } = listFollowupsSchema.parse(input);
    const filter = status === "all" ? "user_id=?" : "user_id=? AND status=?";
    const args = status === "all" ? [this.userId] : [this.userId, status];
    const { results } = await this.db.prepare(`SELECT ${columns} FROM mail_followups WHERE ${filter} ORDER BY status DESC,due_date,id LIMIT ? OFFSET ?`)
      .bind(...args, limit, offset).all<FollowupRow>();
    const count = await this.db.prepare(`SELECT COUNT(*) AS total FROM mail_followups WHERE ${filter}`)
      .bind(...args).first<{ total: number }>();
    const total = count?.total ?? 0;
    return { asOf, total, hasMore: offset + results.length < total, nextOffset: offset + results.length < total ? offset + results.length : null,
      followups: results.map((row) => present(row, asOf)) };
  }

  async update(input: z.infer<typeof updateFollowupSchema>) {
    const value = updateFollowupSchema.parse(input);
    const row = await this.db.prepare(`UPDATE mail_followups SET title=COALESCE(?,title),due_date=COALESCE(?,due_date),status=COALESCE(?,status),updated_at=? WHERE user_id=? AND id=? RETURNING ${columns}`)
      .bind(value.title ?? null, value.dueDate ?? null, value.status ?? null, new Date().toISOString(), this.userId, value.id)
      .first<FollowupRow>();
    if (!row) throw new FollowupError("Follow-up not found in this mailbox.");
    return { followup: present(row, new Date().toISOString().slice(0, 10)) };
  }

  async delete(id: string) {
    const row = await this.db.prepare("DELETE FROM mail_followups WHERE user_id=? AND id=? RETURNING id")
      .bind(this.userId, z.uuid().parse(id)).first<{ id: string }>();
    if (!row) throw new FollowupError("Follow-up not found in this mailbox.");
    return { deleted: true, id: row.id };
  }
}
