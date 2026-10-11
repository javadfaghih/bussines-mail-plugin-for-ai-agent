CREATE TABLE IF NOT EXISTS mail_followups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES mail_accounts(user_id) ON DELETE CASCADE,
  source_uid INTEGER NOT NULL CHECK(source_uid > 0),
  source_uid_validity TEXT NOT NULL,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'done')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, source_uid_validity, source_uid)
);
CREATE INDEX IF NOT EXISTS mail_followups_due ON mail_followups(user_id, status, due_date, id);
