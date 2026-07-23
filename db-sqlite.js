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
      active INTEGER NOT NULL DEFAULT 1,
      bio TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS moderation_logs (
      id TEXT PRIMARY KEY,
      actor TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

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
      SELECT nickname, display_name AS displayName, password_hash AS passwordHash, salt, role, active,
        bio, avatar_url AS avatarUrl, created_at AS createdAt
      FROM accounts
      WHERE nickname = ?
    `)
    .get(nickname);
}

export async function listAccounts() {
  return db
    .prepare(`
      SELECT nickname, display_name AS displayName, role, active, created_at AS createdAt
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
      SELECT blocked, created_at AS createdAt
      FROM private_blocks
      WHERE blocker = ?
      ORDER BY created_at DESC
    `)
    .all(blocker);
}

export async function getMessageById(id) {
  return db
    .prepare(`
      SELECT id, room, type, nickname, text, created_at AS createdAt
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
    INSERT INTO accounts (nickname, display_name, password_hash, salt, role, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    account.nickname,
    account.displayName,
    account.passwordHash,
    account.salt,
    account.role,
    1,
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
  db.prepare("DELETE FROM messages WHERE room = ?").run(name);
  db.prepare("DELETE FROM rooms WHERE name = ?").run(name);
}

export async function getRoomHistory(room, limit = 80) {
  return db
    .prepare(`
      SELECT id, type, nickname, text, created_at AS createdAt
      FROM messages
      WHERE room = ?
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(room, limit)
    .reverse();
}

export async function saveMessage(room, message) {
  db.prepare(`
    INSERT OR REPLACE INTO messages (id, room, type, nickname, text, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(message.id, room, message.type, message.nickname, message.text, message.createdAt);
}

export async function trimRoomHistory(room, limit = 250) {
  db.prepare(`
    DELETE FROM messages
    WHERE room = ?
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
