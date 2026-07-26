import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "data");
const dbPath = join(dataDir, "tchatelia.sqlite");

mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(dbPath);

const defaultRooms = [
  ["accueil", "Salon general pour discuter librement."],
  ["aide", "Questions, entraide et nouveaux arrivants."],
  ["musique", "Discussions autour de la musique."],
  ["rencontres", "Salon convivial pour faire connaissance."],
];

export async function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      name TEXT PRIMARY KEY,
      topic TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      room TEXT NOT NULL,
      type TEXT NOT NULL,
      nickname TEXT NOT NULL,
      text TEXT NOT NULL,
      author_id TEXT NOT NULL DEFAULT '',
      author_gender TEXT NOT NULL DEFAULT 'other',
      author_role TEXT NOT NULL DEFAULT 'user',
      reply_to_id TEXT NOT NULL DEFAULT '',
      reply_to_nickname TEXT NOT NULL DEFAULT '',
      reply_to_text TEXT NOT NULL DEFAULT '',
      reply_to_deleted INTEGER NOT NULL DEFAULT 0,
      edited_at INTEGER,
      deleted_at INTEGER,
      deleted_by TEXT NOT NULL DEFAULT '',
      reaction_data TEXT NOT NULL DEFAULT '{}',
      pinned_at INTEGER,
      pinned_by TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      FOREIGN KEY (room) REFERENCES rooms(name)
    );

    CREATE TABLE IF NOT EXISTS bans (
      nickname TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      banned_by TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      nickname TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL,
      gender TEXT NOT NULL DEFAULT 'other',
      active INTEGER NOT NULL DEFAULT 1,
      bio TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      private_messages_enabled INTEGER NOT NULL DEFAULT 1,
      email TEXT NOT NULL DEFAULT '',
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS message_favorites (
      account_nickname TEXT NOT NULL,
      message_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (account_nickname, message_id),
      FOREIGN KEY (account_nickname) REFERENCES accounts(nickname),
      FOREIGN KEY (message_id) REFERENCES messages(id)
    );

    CREATE INDEX IF NOT EXISTS message_favorites_account_idx
      ON message_favorites (account_nickname, created_at DESC);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash TEXT PRIMARY KEY,
      account_nickname TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (account_nickname) REFERENCES accounts(nickname)
    );

    CREATE INDEX IF NOT EXISTS password_reset_account_idx
      ON password_reset_tokens (account_nickname, created_at DESC);

    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      token_hash TEXT PRIMARY KEY,
      account_nickname TEXT NOT NULL,
      email TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (account_nickname) REFERENCES accounts(nickname)
    );

    CREATE INDEX IF NOT EXISTS email_verification_account_idx
      ON email_verification_tokens (account_nickname, created_at DESC);

    CREATE TABLE IF NOT EXISTS account_sessions (
      token_hash TEXT PRIMARY KEY,
      account_nickname TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      last_used_at INTEGER NOT NULL,
      FOREIGN KEY (account_nickname) REFERENCES accounts(nickname)
    );

    CREATE INDEX IF NOT EXISTS account_sessions_account_idx
      ON account_sessions (account_nickname, created_at DESC);

    CREATE TABLE IF NOT EXISTS moderation_logs (
      id TEXT PRIMARY KEY,
      actor TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS security_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      identity_hash TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS security_events_created_idx
      ON security_events (created_at DESC);

    CREATE TABLE IF NOT EXISTS private_messages (
      id TEXT PRIMARY KEY,
      sender TEXT NOT NULL,
      recipient TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      read_at INTEGER,
      FOREIGN KEY (sender) REFERENCES accounts(nickname),
      FOREIGN KEY (recipient) REFERENCES accounts(nickname)
    );

    CREATE INDEX IF NOT EXISTS private_messages_sender_recipient_idx
      ON private_messages (sender, recipient, created_at DESC);

    CREATE INDEX IF NOT EXISTS private_messages_recipient_read_idx
      ON private_messages (recipient, read_at, created_at DESC);

    CREATE TABLE IF NOT EXISTS private_blocks (
      blocker TEXT NOT NULL,
      blocked TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (blocker, blocked),
      FOREIGN KEY (blocker) REFERENCES accounts(nickname),
      FOREIGN KEY (blocked) REFERENCES accounts(nickname)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter TEXT NOT NULL,
      reporter_display TEXT NOT NULL,
      target TEXT NOT NULL,
      target_display TEXT NOT NULL,
      kind TEXT NOT NULL,
      reference TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT NOT NULL,
      content_snapshot TEXT NOT NULL,
      room TEXT NOT NULL,
      status TEXT NOT NULL,
      handled_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      handled_at INTEGER,
      FOREIGN KEY (reporter) REFERENCES accounts(nickname)
    );

    CREATE INDEX IF NOT EXISTS reports_status_created_idx
      ON reports (status, created_at DESC);

    CREATE INDEX IF NOT EXISTS reports_reporter_reference_idx
      ON reports (reporter, reference, status);

    CREATE TABLE IF NOT EXISTS contact_messages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL,
      handled_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      handled_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS contact_messages_status_created_idx
      ON contact_messages (status, created_at DESC);
  `);

  try {
    db.exec("ALTER TABLE accounts ADD COLUMN active INTEGER NOT NULL DEFAULT 1");
  } catch (error) {
    if (!String(error.message).includes("duplicate column")) throw error;
  }

  try {
    db.exec("ALTER TABLE accounts ADD COLUMN bio TEXT NOT NULL DEFAULT ''");
  } catch (error) {
    if (!String(error.message).includes("duplicate column")) throw error;
  }

  try {
    db.exec("ALTER TABLE accounts ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ''");
  } catch (error) {
    if (!String(error.message).includes("duplicate column")) throw error;
  }

  try {
    db.exec(
      "ALTER TABLE accounts ADD COLUMN private_messages_enabled INTEGER NOT NULL DEFAULT 1"
    );
  } catch (error) {
    if (!String(error.message).includes("duplicate column")) throw error;
  }

  try {
    db.exec("ALTER TABLE accounts ADD COLUMN email TEXT NOT NULL DEFAULT ''");
  } catch (error) {
    if (!String(error.message).includes("duplicate column")) throw error;
  }

  try {
    db.exec("ALTER TABLE accounts ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1");
  } catch (error) {
    if (!String(error.message).includes("duplicate column")) throw error;
  }

  try {
    db.exec("ALTER TABLE accounts ADD COLUMN gender TEXT NOT NULL DEFAULT 'other'");
  } catch (error) {
    if (!String(error.message).includes("duplicate column")) throw error;
  }

  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_unique_idx ON accounts(email) WHERE email <> ''"
  );

  const messageMigrations = [
    "ALTER TABLE messages ADD COLUMN author_id TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE messages ADD COLUMN author_gender TEXT NOT NULL DEFAULT 'other'",
    "ALTER TABLE messages ADD COLUMN author_role TEXT NOT NULL DEFAULT 'user'",
    "ALTER TABLE messages ADD COLUMN reply_to_id TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE messages ADD COLUMN reply_to_nickname TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE messages ADD COLUMN reply_to_text TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE messages ADD COLUMN reply_to_deleted INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE messages ADD COLUMN edited_at INTEGER",
    "ALTER TABLE messages ADD COLUMN deleted_at INTEGER",
    "ALTER TABLE messages ADD COLUMN deleted_by TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE messages ADD COLUMN reaction_data TEXT NOT NULL DEFAULT '{}'",
    "ALTER TABLE messages ADD COLUMN pinned_at INTEGER",
    "ALTER TABLE messages ADD COLUMN pinned_by TEXT NOT NULL DEFAULT ''",
  ];

  for (const migration of messageMigrations) {
    try {
      db.exec(migration);
    } catch (error) {
      if (!String(error.message).includes("duplicate column")) throw error;
    }
  }

  db.exec(`
    UPDATE messages
    SET author_role = COALESCE(
      (
        SELECT accounts.role
        FROM accounts
        WHERE messages.author_id = 'account:' || accounts.nickname
      ),
      author_role
    )
    WHERE author_id LIKE 'account:%'
  `);

  const insertRoom = db.prepare(`
    INSERT OR IGNORE INTO rooms (name, topic, created_at)
    VALUES (?, ?, ?)
  `);

  for (const [name, topic] of defaultRooms) {
    insertRoom.run(name, topic, Date.now());
  }
}

export function getDatabaseLabel() {
  return "SQLite local";
}

export async function getRooms() {
  return db.prepare("SELECT name, topic FROM rooms ORDER BY created_at ASC").all();
}

export async function getAccountByNickname(nickname) {
  return db
    .prepare(`
      SELECT nickname, display_name AS displayName, password_hash AS passwordHash, salt, role,
        gender, active,
        bio, avatar_url AS avatarUrl,
        private_messages_enabled AS privateMessagesEnabled, email,
        email_verified AS emailVerified,
        created_at AS createdAt
      FROM accounts
      WHERE nickname = ?
    `)
    .get(nickname);
}

export async function getAccountByEmail(email) {
  return db
    .prepare(`
      SELECT nickname, display_name AS displayName, password_hash AS passwordHash, salt, role,
        gender, active,
        bio, avatar_url AS avatarUrl,
        private_messages_enabled AS privateMessagesEnabled, email,
        email_verified AS emailVerified,
        created_at AS createdAt
      FROM accounts
      WHERE email = ?
    `)
    .get(email);
}

export async function listAccounts() {
  return db
    .prepare(`
      SELECT nickname, display_name AS displayName, role, gender, active,
        private_messages_enabled AS privateMessagesEnabled,
        created_at AS createdAt
      FROM accounts
      ORDER BY created_at DESC
    `)
    .all();
}

export async function listModerationLogs(limit = 100) {
  return db
    .prepare(`
      SELECT id, actor, actor_role AS actorRole, action, target, details, created_at AS createdAt
      FROM moderation_logs
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(limit);
}

export async function saveModerationLog(log) {
  db.prepare(`
    INSERT INTO moderation_logs (id, actor, actor_role, action, target, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(log.id, log.actor, log.actorRole, log.action, log.target, log.details, log.createdAt);
  db.exec(`
    DELETE FROM moderation_logs
    WHERE id NOT IN (
      SELECT id
      FROM moderation_logs
      ORDER BY created_at DESC
      LIMIT 500
    )
  `);
}

export async function listSecurityEvents(limit = 100) {
  return db
    .prepare(`
      SELECT id, event_type AS eventType, identity_hash AS identityHash,
        details, created_at AS createdAt
      FROM security_events
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(limit);
}

export async function saveSecurityEvent(event) {
  db.prepare(`
    INSERT INTO security_events (id, event_type, identity_hash, details, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    event.id,
    event.eventType,
    event.identityHash,
    event.details,
    event.createdAt
  );
  db.exec(`
    DELETE FROM security_events
    WHERE id NOT IN (
      SELECT id
      FROM security_events
      ORDER BY created_at DESC
      LIMIT 1000
    )
  `);
}

export async function savePrivateMessage(message) {
  db.prepare(`
    INSERT INTO private_messages (id, sender, recipient, text, created_at, read_at)
    VALUES (?, ?, ?, ?, ?, NULL)
  `).run(message.id, message.sender, message.recipient, message.text, message.createdAt);
  db.prepare(`
    DELETE FROM private_messages
    WHERE ((sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?))
      AND id NOT IN (
        SELECT id
        FROM private_messages
        WHERE (sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)
        ORDER BY created_at DESC
        LIMIT 250
      )
  `).run(
    message.sender,
    message.recipient,
    message.recipient,
    message.sender,
    message.sender,
    message.recipient,
    message.recipient,
    message.sender
  );
}

export async function getPrivateConversation(accountA, accountB, limit = 80) {
  return db
    .prepare(`
      SELECT id, sender, recipient, text, created_at AS createdAt, read_at AS readAt
      FROM private_messages
      WHERE (sender = ? AND recipient = ?)
        OR (sender = ? AND recipient = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(accountA, accountB, accountB, accountA, limit)
    .reverse();
}

export async function listPrivateMessagesForAccount(account, limit = 5000) {
  return db
    .prepare(`
      SELECT id, sender, recipient, text, created_at AS createdAt, read_at AS readAt
      FROM private_messages
      WHERE sender = ? OR recipient = ?
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(account, account, limit);
}

export async function markPrivateMessagesRead(recipient, sender, readAt) {
  db.prepare(`
    UPDATE private_messages
    SET read_at = ?
    WHERE recipient = ? AND sender = ? AND read_at IS NULL
  `).run(readAt, recipient, sender);
}

export async function setPrivateBlock(blocker, blocked, shouldBlock) {
  if (shouldBlock) {
    db.prepare(`
      INSERT OR IGNORE INTO private_blocks (blocker, blocked, created_at)
      VALUES (?, ?, ?)
    `).run(blocker, blocked, Date.now());
    return;
  }

  db.prepare("DELETE FROM private_blocks WHERE blocker = ? AND blocked = ?").run(
    blocker,
    blocked
  );
}

export async function getPrivateBlockState(accountA, accountB) {
  const rows = db
    .prepare(`
      SELECT blocker, blocked
      FROM private_blocks
      WHERE (blocker = ? AND blocked = ?)
        OR (blocker = ? AND blocked = ?)
    `)
    .all(accountA, accountB, accountB, accountA);

  return {
    blockedByMe: rows.some((row) => row.blocker === accountA),
    blockedByThem: rows.some((row) => row.blocker === accountB),
  };
}

export async function listPrivateBlocks(blocker) {
  return db
    .prepare(`
      SELECT private_blocks.blocked, private_blocks.created_at AS createdAt,
        accounts.display_name AS displayName
      FROM private_blocks
      JOIN accounts ON accounts.nickname = private_blocks.blocked
      WHERE private_blocks.blocker = ?
      ORDER BY private_blocks.created_at DESC
    `)
    .all(blocker);
}

export async function getMessageById(id) {
  return db
    .prepare(`
      SELECT id, room, type, nickname, text, author_id AS authorId,
        author_gender AS gender, author_role AS role,
        reply_to_id AS replyToId, reply_to_nickname AS replyToNickname,
        reply_to_text AS replyToText, reply_to_deleted AS replyToDeleted,
        edited_at AS editedAt, deleted_at AS deletedAt, deleted_by AS deletedBy,
        reaction_data AS reactionData, pinned_at AS pinnedAt, pinned_by AS pinnedBy,
        created_at AS createdAt
      FROM messages
      WHERE id = ?
    `)
    .get(id);
}

export async function getPrivateMessageById(id) {
  return db
    .prepare(`
      SELECT id, sender, recipient, text, created_at AS createdAt
      FROM private_messages
      WHERE id = ?
    `)
    .get(id);
}

export async function hasOpenReport(reporter, reference) {
  return Boolean(
    db
      .prepare(`
        SELECT 1
        FROM reports
        WHERE reporter = ? AND reference = ? AND status = 'open'
        LIMIT 1
      `)
      .get(reporter, reference)
  );
}

export async function createReport(report) {
  db.prepare(`
    INSERT INTO reports (
      id, reporter, reporter_display, target, target_display, kind, reference,
      reason, details, content_snapshot, room, status, handled_by, created_at, handled_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', '', ?, NULL)
  `).run(
    report.id,
    report.reporter,
    report.reporterDisplay,
    report.target,
    report.targetDisplay,
    report.kind,
    report.reference,
    report.reason,
    report.details,
    report.contentSnapshot,
    report.room,
    report.createdAt
  );
}

export async function listReports(limit = 100) {
  return db
    .prepare(`
      SELECT id, reporter, reporter_display AS reporterDisplay, target,
        target_display AS targetDisplay, kind, reference, reason, details,
        content_snapshot AS contentSnapshot, room, status,
        handled_by AS handledBy, created_at AS createdAt, handled_at AS handledAt
      FROM reports
      ORDER BY CASE WHEN status = 'open' THEN 0 ELSE 1 END, created_at DESC
      LIMIT ?
    `)
    .all(limit);
}

export async function getReportById(id) {
  return db
    .prepare(`
      SELECT id, reporter, reporter_display AS reporterDisplay, target,
        target_display AS targetDisplay, kind, reference, reason, details,
        content_snapshot AS contentSnapshot, room, status,
        handled_by AS handledBy, created_at AS createdAt, handled_at AS handledAt
      FROM reports
      WHERE id = ?
    `)
    .get(id);
}

export async function updateReportStatus(id, status, handledBy) {
  db.prepare(`
    UPDATE reports
    SET status = ?, handled_by = ?, handled_at = ?
      WHERE id = ?
  `).run(status, handledBy, Date.now(), id);
  db.exec(`
    DELETE FROM reports
    WHERE status != 'open'
      AND id NOT IN (
        SELECT id FROM reports
        ORDER BY created_at DESC
        LIMIT 1000
      )
  `);
  db.prepare("DELETE FROM reports WHERE status != 'open' AND handled_at < ?").run(
    Date.now() - 730 * 24 * 60 * 60 * 1000
  );
}

export async function createContactMessage(contactMessage) {
  db.prepare(`
    INSERT INTO contact_messages (
      id, name, email, subject, message, status, handled_by, created_at, handled_at
    )
    VALUES (?, ?, ?, ?, ?, 'open', '', ?, NULL)
  `).run(
    contactMessage.id,
    contactMessage.name,
    contactMessage.email,
    contactMessage.subject,
    contactMessage.message,
    contactMessage.createdAt
  );
}

export async function listContactMessages(limit = 100) {
  return db
    .prepare(`
      SELECT id, name, email, subject, message, status,
        handled_by AS handledBy, created_at AS createdAt, handled_at AS handledAt
      FROM contact_messages
      ORDER BY CASE WHEN status = 'open' THEN 0 ELSE 1 END, created_at DESC
      LIMIT ?
    `)
    .all(limit);
}

export async function getContactMessageById(id) {
  return db
    .prepare(`
      SELECT id, name, email, subject, message, status,
        handled_by AS handledBy, created_at AS createdAt, handled_at AS handledAt
      FROM contact_messages
      WHERE id = ?
    `)
    .get(id);
}

export async function updateContactMessageStatus(id, status, handledBy) {
  db.prepare(`
    UPDATE contact_messages
    SET status = ?, handled_by = ?, handled_at = ?
    WHERE id = ?
  `).run(status, handledBy, Date.now(), id);
  db.prepare("DELETE FROM contact_messages WHERE status != 'open' AND handled_at < ?").run(
    Date.now() - 365 * 24 * 60 * 60 * 1000
  );
}

export async function createAccount(account) {
  db.prepare(`
    INSERT INTO accounts (
      nickname, display_name, password_hash, salt, role, gender, active, email,
      email_verified, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    account.nickname,
    account.displayName,
    account.passwordHash,
    account.salt,
    account.role,
    account.gender || "other",
    1,
    account.email || "",
    account.emailVerified ? 1 : 0,
    Date.now()
  );
}

export async function updateAccountRole(nickname, role) {
  db.prepare("UPDATE accounts SET role = ? WHERE nickname = ?").run(role, nickname);
}

export async function setAccountActive(nickname, active) {
  db.prepare("UPDATE accounts SET active = ? WHERE nickname = ?").run(active ? 1 : 0, nickname);
}

export async function updateAccountPassword(nickname, passwordRecord) {
  db.prepare("UPDATE accounts SET password_hash = ?, salt = ? WHERE nickname = ?").run(
    passwordRecord.passwordHash,
    passwordRecord.salt,
    nickname
  );
}

export async function updateAccountProfile(nickname, profile) {
  db.prepare("UPDATE accounts SET bio = ?, avatar_url = ? WHERE nickname = ?").run(
    profile.bio,
    profile.avatarUrl,
    nickname
  );
}

export async function updateAccountSettings(nickname, settings) {
  db.prepare(`
    UPDATE accounts
    SET display_name = ?, private_messages_enabled = ?, email = ?, email_verified = ?
    WHERE nickname = ?
  `).run(
    settings.displayName,
    settings.privateMessagesEnabled ? 1 : 0,
    settings.email,
    settings.emailVerified ? 1 : 0,
    nickname
  );
}

export async function createEmailVerificationToken(token) {
  db.exec("BEGIN");
  try {
    db.prepare(`
      DELETE FROM email_verification_tokens
      WHERE expires_at < ? OR account_nickname = ?
    `).run(Date.now(), token.accountNickname);
    db.prepare(`
      INSERT INTO email_verification_tokens (
        token_hash, account_nickname, email, expires_at, used_at, created_at
      )
      VALUES (?, ?, ?, ?, NULL, ?)
    `).run(
      token.tokenHash,
      token.accountNickname,
      token.email,
      token.expiresAt,
      token.createdAt
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function getEmailVerificationToken(tokenHash) {
  return db
    .prepare(`
      SELECT token_hash AS tokenHash, account_nickname AS accountNickname, email,
        expires_at AS expiresAt, used_at AS usedAt, created_at AS createdAt
      FROM email_verification_tokens
      WHERE token_hash = ?
    `)
    .get(tokenHash);
}

export async function markEmailVerificationTokenUsed(tokenHash, usedAt) {
  db.prepare(`
    UPDATE email_verification_tokens
    SET used_at = ?
    WHERE token_hash = ? AND used_at IS NULL
  `).run(usedAt, tokenHash);
}

export async function setAccountEmailVerified(nickname, verified) {
  db.prepare("UPDATE accounts SET email_verified = ? WHERE nickname = ?").run(
    verified ? 1 : 0,
    nickname
  );
}

export async function clearAccountEmailTokens(nickname) {
  db.prepare("DELETE FROM password_reset_tokens WHERE account_nickname = ?").run(nickname);
  db.prepare("DELETE FROM email_verification_tokens WHERE account_nickname = ?").run(nickname);
}

export async function createAccountSession(session) {
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM account_sessions WHERE expires_at < ?").run(Date.now());
    db.prepare(`
      INSERT INTO account_sessions (
        token_hash, account_nickname, expires_at, created_at, last_used_at
      )
      VALUES (?, ?, ?, ?, ?)
    `).run(
      session.tokenHash,
      session.accountNickname,
      session.expiresAt,
      session.createdAt,
      session.createdAt
    );
    db.prepare(`
      DELETE FROM account_sessions
      WHERE token_hash IN (
        SELECT token_hash
        FROM account_sessions
        WHERE account_nickname = ?
        ORDER BY created_at DESC
        LIMIT -1 OFFSET 10
      )
    `).run(session.accountNickname);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function getAccountSession(tokenHash) {
  return db
    .prepare(`
      SELECT token_hash AS tokenHash, account_nickname AS accountNickname,
        expires_at AS expiresAt, created_at AS createdAt, last_used_at AS lastUsedAt
      FROM account_sessions
      WHERE token_hash = ?
    `)
    .get(tokenHash);
}

export async function touchAccountSession(tokenHash, lastUsedAt) {
  db.prepare(`
    UPDATE account_sessions
    SET last_used_at = ?
    WHERE token_hash = ?
  `).run(lastUsedAt, tokenHash);
}

export async function deleteAccountSession(tokenHash) {
  db.prepare("DELETE FROM account_sessions WHERE token_hash = ?").run(tokenHash);
}

export async function deleteAccountSessions(nickname) {
  db.prepare("DELETE FROM account_sessions WHERE account_nickname = ?").run(nickname);
}

export async function createPasswordResetToken(token) {
  db.exec("BEGIN");
  try {
    db.prepare("DELETE FROM password_reset_tokens WHERE expires_at < ? OR account_nickname = ?").run(
      Date.now(),
      token.accountNickname
    );
    db.prepare(`
      INSERT INTO password_reset_tokens (
        token_hash, account_nickname, expires_at, used_at, created_at
      )
      VALUES (?, ?, ?, NULL, ?)
    `).run(token.tokenHash, token.accountNickname, token.expiresAt, token.createdAt);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function getPasswordResetToken(tokenHash) {
  return db
    .prepare(`
      SELECT token_hash AS tokenHash, account_nickname AS accountNickname,
        expires_at AS expiresAt, used_at AS usedAt, created_at AS createdAt
      FROM password_reset_tokens
      WHERE token_hash = ?
    `)
    .get(tokenHash);
}

export async function markPasswordResetTokenUsed(tokenHash, usedAt) {
  db.prepare(`
    UPDATE password_reset_tokens
    SET used_at = ?
    WHERE token_hash = ? AND used_at IS NULL
  `).run(usedAt, tokenHash);
}

export async function deleteAccount(nickname) {
  db.exec("BEGIN");
  try {
    const accountId = `account:${nickname}`;
    const reactionRows = db
      .prepare("SELECT id, reaction_data AS reactionData FROM messages WHERE reaction_data <> '{}'")
      .all();
    const updateReactions = db.prepare(
      "UPDATE messages SET reaction_data = ? WHERE id = ?"
    );
    for (const row of reactionRows) {
      let reactions = {};
      try {
        reactions = JSON.parse(row.reactionData || "{}");
      } catch {
        reactions = {};
      }
      let changed = false;
      for (const key of Object.keys(reactions)) {
        if (!Array.isArray(reactions[key])) continue;
        const filtered = reactions[key].filter((value) => value !== accountId);
        if (filtered.length === reactions[key].length) continue;
        changed = true;
        if (filtered.length) {
          reactions[key] = filtered;
        } else {
          delete reactions[key];
        }
      }
      if (changed) updateReactions.run(JSON.stringify(reactions), row.id);
    }
    db.prepare("DELETE FROM reports WHERE reporter = ?").run(nickname);
    db.prepare("DELETE FROM password_reset_tokens WHERE account_nickname = ?").run(nickname);
    db.prepare("DELETE FROM email_verification_tokens WHERE account_nickname = ?").run(nickname);
    db.prepare("DELETE FROM account_sessions WHERE account_nickname = ?").run(nickname);
    db.prepare("DELETE FROM message_favorites WHERE account_nickname = ?").run(nickname);
    db.prepare("DELETE FROM private_blocks WHERE blocker = ? OR blocked = ?").run(
      nickname,
      nickname
    );
    db.prepare("DELETE FROM private_messages WHERE sender = ? OR recipient = ?").run(
      nickname,
      nickname
    );
    db.prepare("DELETE FROM accounts WHERE nickname = ?").run(nickname);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function createRoom(name, topic) {
  db.prepare(`
    INSERT INTO rooms (name, topic, created_at)
    VALUES (?, ?, ?)
  `).run(name, topic, Date.now());
}

export async function updateRoomTopic(name, topic) {
  db.prepare("UPDATE rooms SET topic = ? WHERE name = ?").run(topic, name);
}

export async function deleteRoom(name) {
  db.prepare(`
    DELETE FROM message_favorites
    WHERE message_id IN (SELECT id FROM messages WHERE room = ?)
  `).run(name);
  db.prepare("DELETE FROM messages WHERE room = ?").run(name);
  db.prepare("DELETE FROM rooms WHERE name = ?").run(name);
}

export async function getRoomHistory(room, limit = 80) {
  return db
    .prepare(`
      SELECT id, type, nickname, text, author_id AS authorId,
        author_gender AS gender, author_role AS role,
        reply_to_id AS replyToId, reply_to_nickname AS replyToNickname,
        reply_to_text AS replyToText, reply_to_deleted AS replyToDeleted,
        edited_at AS editedAt, deleted_at AS deletedAt, deleted_by AS deletedBy,
        reaction_data AS reactionData, pinned_at AS pinnedAt, pinned_by AS pinnedBy,
        created_at AS createdAt
      FROM messages
      WHERE id IN (
        SELECT id FROM messages
        WHERE room = ?
        ORDER BY created_at DESC
        LIMIT ?
      )
        OR (room = ? AND pinned_at IS NOT NULL)
      ORDER BY created_at ASC
    `)
    .all(room, limit, room);
}

export async function saveMessage(room, message) {
  db.prepare(`
    INSERT OR REPLACE INTO messages (
      id, room, type, nickname, text, author_id, author_gender, author_role,
      reply_to_id, reply_to_nickname, reply_to_text, reply_to_deleted,
      edited_at, deleted_at, deleted_by, reaction_data, pinned_at, pinned_by, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    message.id,
    room,
    message.type,
    message.nickname,
    message.text,
    message.authorId || "",
    message.gender || "other",
    message.role || "user",
    message.replyToId || "",
    message.replyToNickname || "",
    message.replyToText || "",
    message.replyToDeleted ? 1 : 0,
    message.editedAt || null,
    message.deletedAt || null,
    message.deletedBy || "",
    message.reactionData || "{}",
    message.pinnedAt || null,
    message.pinnedBy || "",
    message.createdAt
  );
}

export async function updateMessageText(id, text, editedAt) {
  db.exec("BEGIN");
  try {
    db.prepare(`
      UPDATE messages
      SET text = ?, edited_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `).run(text, editedAt, id);
    db.prepare(`
      UPDATE messages
      SET reply_to_text = ?
      WHERE reply_to_id = ? AND reply_to_deleted = 0
    `).run(text.slice(0, 160), id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function deleteMessageContent(id, deletedAt, deletedBy) {
  db.exec("BEGIN");
  try {
    db.prepare(`
      UPDATE messages
      SET text = '', deleted_at = ?, deleted_by = ?, reaction_data = '{}',
        pinned_at = NULL, pinned_by = ''
      WHERE id = ? AND deleted_at IS NULL
    `).run(deletedAt, deletedBy, id);
    db.prepare(`
      UPDATE messages
      SET reply_to_text = '', reply_to_deleted = 1
      WHERE reply_to_id = ?
    `).run(id);
    db.prepare("DELETE FROM message_favorites WHERE message_id = ?").run(id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function updateMessageReactions(id, reactionData) {
  db.prepare(`
    UPDATE messages
    SET reaction_data = ?
    WHERE id = ? AND deleted_at IS NULL
  `).run(reactionData, id);
}

export async function setMessageFavorite(accountNickname, messageId, favorite) {
  if (favorite) {
    db.prepare(`
      INSERT OR IGNORE INTO message_favorites (account_nickname, message_id, created_at)
      VALUES (?, ?, ?)
    `).run(accountNickname, messageId, Date.now());
    return;
  }
  db.prepare(`
    DELETE FROM message_favorites
    WHERE account_nickname = ? AND message_id = ?
  `).run(accountNickname, messageId);
}

export async function listFavoriteMessageIds(accountNickname) {
  return db
    .prepare(`
      SELECT message_id AS messageId
      FROM message_favorites
      WHERE account_nickname = ?
    `)
    .all(accountNickname)
    .map((row) => row.messageId);
}

export async function setPinnedMessage(room, messageId, pinnedAt, pinnedBy) {
  db.exec("BEGIN");
  try {
    db.prepare(`
      UPDATE messages
      SET pinned_at = NULL, pinned_by = ''
      WHERE room = ?
    `).run(room);
    if (messageId) {
      db.prepare(`
        UPDATE messages
        SET pinned_at = ?, pinned_by = ?
        WHERE id = ? AND room = ? AND deleted_at IS NULL AND type != 'system'
      `).run(pinnedAt, pinnedBy, messageId, room);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function trimRoomHistory(room, limit = 250) {
  db.prepare(`
    DELETE FROM message_favorites
    WHERE message_id IN (
      SELECT id FROM messages
      WHERE room = ?
        AND pinned_at IS NULL
        AND id NOT IN (
          SELECT id FROM messages
          WHERE room = ?
          ORDER BY created_at DESC
          LIMIT ?
        )
    )
  `).run(room, room, limit);
  db.prepare(`
    DELETE FROM messages
    WHERE room = ?
      AND pinned_at IS NULL
      AND id NOT IN (
        SELECT id FROM messages
        WHERE room = ?
        ORDER BY created_at DESC
        LIMIT ?
      )
  `).run(room, room, limit);
}

export async function isBanned(nickname) {
  return Boolean(db.prepare("SELECT 1 FROM bans WHERE nickname = ?").get(nickname));
}

export async function banNickname(nickname, displayName, bannedBy) {
  db.prepare(`
    INSERT OR REPLACE INTO bans (nickname, display_name, banned_by, created_at)
    VALUES (?, ?, ?, ?)
  `).run(nickname, displayName, bannedBy, Date.now());
}

export async function unbanNickname(nickname) {
  db.prepare("DELETE FROM bans WHERE nickname = ?").run(nickname);
}
