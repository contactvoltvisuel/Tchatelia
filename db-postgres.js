import pg from "pg";

const { Pool } = pg;

const defaultRooms = [
  ["accueil", "Salon general pour discuter librement."],
  ["aide", "Questions, entraide et nouveaux arrivants."],
  ["musique", "Discussions autour de la musique."],
  ["rencontres", "Salon convivial pour faire connaissance."],
];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});

export async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      name TEXT PRIMARY KEY,
      topic TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      room TEXT NOT NULL REFERENCES rooms(name),
      type TEXT NOT NULL,
      nickname TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bans (
      nickname TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      banned_by TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      nickname TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      bio TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS moderation_logs (
      id TEXT PRIMARY KEY,
      actor TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS private_messages (
      id TEXT PRIMARY KEY,
      sender TEXT NOT NULL REFERENCES accounts(nickname),
      recipient TEXT NOT NULL REFERENCES accounts(nickname),
      text TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      read_at BIGINT
    );

    CREATE INDEX IF NOT EXISTS private_messages_sender_recipient_idx
      ON private_messages (sender, recipient, created_at DESC);

    CREATE INDEX IF NOT EXISTS private_messages_recipient_read_idx
      ON private_messages (recipient, read_at, created_at DESC);

    CREATE TABLE IF NOT EXISTS private_blocks (
      blocker TEXT NOT NULL REFERENCES accounts(nickname),
      blocked TEXT NOT NULL REFERENCES accounts(nickname),
      created_at BIGINT NOT NULL,
      PRIMARY KEY (blocker, blocked)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter TEXT NOT NULL REFERENCES accounts(nickname),
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
      created_at BIGINT NOT NULL,
      handled_at BIGINT
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
      created_at BIGINT NOT NULL,
      handled_at BIGINT
    );

    CREATE INDEX IF NOT EXISTS contact_messages_status_created_idx
      ON contact_messages (status, created_at DESC);
  `);

  await pool.query("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE");
  await pool.query("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT ''");
  await pool.query("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT ''");

  for (const [name, topic] of defaultRooms) {
    await pool.query(
      `
        INSERT INTO rooms (name, topic, created_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (name) DO NOTHING
      `,
      [name, topic, Date.now()]
    );
  }
}

export function getDatabaseLabel() {
  return "PostgreSQL";
}

export async function getRooms() {
  const result = await pool.query("SELECT name, topic FROM rooms ORDER BY created_at ASC");
  return result.rows;
}

export async function getAccountByNickname(nickname) {
  const result = await pool.query(
    `
      SELECT nickname, display_name AS "displayName", password_hash AS "passwordHash", salt, role, active,
        bio, avatar_url AS "avatarUrl", created_at AS "createdAt"
      FROM accounts
      WHERE nickname = $1
    `,
    [nickname]
  );
  return result.rows[0];
}

export async function listAccounts() {
  const result = await pool.query(`
    SELECT nickname, display_name AS "displayName", role, active, created_at AS "createdAt"
    FROM accounts
    ORDER BY created_at DESC
  `);
  return result.rows;
}

export async function listModerationLogs(limit = 100) {
  const result = await pool.query(
    `
      SELECT id, actor, actor_role AS "actorRole", action, target, details, created_at AS "createdAt"
      FROM moderation_logs
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [limit]
  );
  return result.rows;
}

export async function saveModerationLog(log) {
  await pool.query(
    `
      INSERT INTO moderation_logs (id, actor, actor_role, action, target, details, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [log.id, log.actor, log.actorRole, log.action, log.target, log.details, log.createdAt]
  );
  await pool.query(`
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
  await pool.query(
    `
      INSERT INTO private_messages (id, sender, recipient, text, created_at, read_at)
      VALUES ($1, $2, $3, $4, $5, NULL)
    `,
    [message.id, message.sender, message.recipient, message.text, message.createdAt]
  );
  await pool.query(
    `
      DELETE FROM private_messages
      WHERE ((sender = $1 AND recipient = $2) OR (sender = $2 AND recipient = $1))
        AND id NOT IN (
          SELECT id
          FROM private_messages
          WHERE (sender = $1 AND recipient = $2) OR (sender = $2 AND recipient = $1)
          ORDER BY created_at DESC
          LIMIT 250
        )
    `,
    [message.sender, message.recipient]
  );
}

export async function getPrivateConversation(accountA, accountB, limit = 80) {
  const result = await pool.query(
    `
      SELECT id, sender, recipient, text, created_at AS "createdAt", read_at AS "readAt"
      FROM private_messages
      WHERE (sender = $1 AND recipient = $2)
        OR (sender = $2 AND recipient = $1)
      ORDER BY created_at DESC
      LIMIT $3
    `,
    [accountA, accountB, limit]
  );
  return result.rows.reverse();
}

export async function listPrivateMessagesForAccount(account, limit = 5000) {
  const result = await pool.query(
    `
      SELECT id, sender, recipient, text, created_at AS "createdAt", read_at AS "readAt"
      FROM private_messages
      WHERE sender = $1 OR recipient = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [account, limit]
  );
  return result.rows;
}

export async function markPrivateMessagesRead(recipient, sender, readAt) {
  await pool.query(
    `
      UPDATE private_messages
      SET read_at = $1
      WHERE recipient = $2 AND sender = $3 AND read_at IS NULL
    `,
    [readAt, recipient, sender]
  );
}

export async function setPrivateBlock(blocker, blocked, shouldBlock) {
  if (shouldBlock) {
    await pool.query(
      `
        INSERT INTO private_blocks (blocker, blocked, created_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (blocker, blocked) DO NOTHING
      `,
      [blocker, blocked, Date.now()]
    );
    return;
  }

  await pool.query("DELETE FROM private_blocks WHERE blocker = $1 AND blocked = $2", [
    blocker,
    blocked,
  ]);
}

export async function getPrivateBlockState(accountA, accountB) {
  const result = await pool.query(
    `
      SELECT blocker, blocked
      FROM private_blocks
      WHERE (blocker = $1 AND blocked = $2)
        OR (blocker = $2 AND blocked = $1)
    `,
    [accountA, accountB]
  );

  return {
    blockedByMe: result.rows.some((row) => row.blocker === accountA),
    blockedByThem: result.rows.some((row) => row.blocker === accountB),
  };
}

export async function listPrivateBlocks(blocker) {
  const result = await pool.query(
    `
      SELECT blocked, created_at AS "createdAt"
      FROM private_blocks
      WHERE blocker = $1
      ORDER BY created_at DESC
    `,
    [blocker]
  );
  return result.rows;
}

export async function getMessageById(id) {
  const result = await pool.query(
    `
      SELECT id, room, type, nickname, text, created_at AS "createdAt"
      FROM messages
      WHERE id = $1
    `,
    [id]
  );
  return result.rows[0];
}

export async function getPrivateMessageById(id) {
  const result = await pool.query(
    `
      SELECT id, sender, recipient, text, created_at AS "createdAt"
      FROM private_messages
      WHERE id = $1
    `,
    [id]
  );
  return result.rows[0];
}

export async function hasOpenReport(reporter, reference) {
  const result = await pool.query(
    `
      SELECT 1
      FROM reports
      WHERE reporter = $1 AND reference = $2 AND status = 'open'
      LIMIT 1
    `,
    [reporter, reference]
  );
  return result.rowCount > 0;
}

export async function createReport(report) {
  await pool.query(
    `
      INSERT INTO reports (
        id, reporter, reporter_display, target, target_display, kind, reference,
        reason, details, content_snapshot, room, status, handled_by, created_at, handled_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'open', '', $12, NULL)
    `,
    [
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
      report.createdAt,
    ]
  );
}

export async function listReports(limit = 100) {
  const result = await pool.query(
    `
      SELECT id, reporter, reporter_display AS "reporterDisplay", target,
        target_display AS "targetDisplay", kind, reference, reason, details,
        content_snapshot AS "contentSnapshot", room, status,
        handled_by AS "handledBy", created_at AS "createdAt", handled_at AS "handledAt"
      FROM reports
      ORDER BY CASE WHEN status = 'open' THEN 0 ELSE 1 END, created_at DESC
      LIMIT $1
    `,
    [limit]
  );
  return result.rows;
}

export async function getReportById(id) {
  const result = await pool.query(
    `
      SELECT id, reporter, reporter_display AS "reporterDisplay", target,
        target_display AS "targetDisplay", kind, reference, reason, details,
        content_snapshot AS "contentSnapshot", room, status,
        handled_by AS "handledBy", created_at AS "createdAt", handled_at AS "handledAt"
      FROM reports
      WHERE id = $1
    `,
    [id]
  );
  return result.rows[0];
}

export async function updateReportStatus(id, status, handledBy) {
  await pool.query(
    `
      UPDATE reports
      SET status = $1, handled_by = $2, handled_at = $3
      WHERE id = $4
    `,
    [status, handledBy, Date.now(), id]
  );
  await pool.query(`
    DELETE FROM reports
    WHERE status != 'open'
      AND id NOT IN (
        SELECT id FROM reports
        ORDER BY created_at DESC
        LIMIT 1000
      )
  `);
  await pool.query("DELETE FROM reports WHERE status != 'open' AND handled_at < $1", [
    Date.now() - 730 * 24 * 60 * 60 * 1000,
  ]);
}

export async function createContactMessage(contactMessage) {
  await pool.query(
    `
      INSERT INTO contact_messages (
        id, name, email, subject, message, status, handled_by, created_at, handled_at
      )
      VALUES ($1, $2, $3, $4, $5, 'open', '', $6, NULL)
    `,
    [
      contactMessage.id,
      contactMessage.name,
      contactMessage.email,
      contactMessage.subject,
      contactMessage.message,
      contactMessage.createdAt,
    ]
  );
}

export async function listContactMessages(limit = 100) {
  const result = await pool.query(
    `
      SELECT id, name, email, subject, message, status,
        handled_by AS "handledBy", created_at AS "createdAt", handled_at AS "handledAt"
      FROM contact_messages
      ORDER BY CASE WHEN status = 'open' THEN 0 ELSE 1 END, created_at DESC
      LIMIT $1
    `,
    [limit]
  );
  return result.rows;
}

export async function getContactMessageById(id) {
  const result = await pool.query(
    `
      SELECT id, name, email, subject, message, status,
        handled_by AS "handledBy", created_at AS "createdAt", handled_at AS "handledAt"
      FROM contact_messages
      WHERE id = $1
    `,
    [id]
  );
  return result.rows[0];
}

export async function updateContactMessageStatus(id, status, handledBy) {
  await pool.query(
    `
      UPDATE contact_messages
      SET status = $1, handled_by = $2, handled_at = $3
      WHERE id = $4
    `,
    [status, handledBy, Date.now(), id]
  );
  await pool.query("DELETE FROM contact_messages WHERE status != 'open' AND handled_at < $1", [
    Date.now() - 365 * 24 * 60 * 60 * 1000,
  ]);
}

export async function createAccount(account) {
  await pool.query(
    `
      INSERT INTO accounts (nickname, display_name, password_hash, salt, role, active, created_at)
      VALUES ($1, $2, $3, $4, $5, TRUE, $6)
    `,
    [
      account.nickname,
      account.displayName,
      account.passwordHash,
      account.salt,
      account.role,
      Date.now(),
    ]
  );
}

export async function updateAccountRole(nickname, role) {
  await pool.query("UPDATE accounts SET role = $1 WHERE nickname = $2", [role, nickname]);
}

export async function setAccountActive(nickname, active) {
  await pool.query("UPDATE accounts SET active = $1 WHERE nickname = $2", [active, nickname]);
}

export async function updateAccountPassword(nickname, passwordRecord) {
  await pool.query("UPDATE accounts SET password_hash = $1, salt = $2 WHERE nickname = $3", [
    passwordRecord.passwordHash,
    passwordRecord.salt,
    nickname,
  ]);
}

export async function updateAccountProfile(nickname, profile) {
  await pool.query("UPDATE accounts SET bio = $1, avatar_url = $2 WHERE nickname = $3", [
    profile.bio,
    profile.avatarUrl,
    nickname,
  ]);
}

export async function createRoom(name, topic) {
  await pool.query(
    "INSERT INTO rooms (name, topic, created_at) VALUES ($1, $2, $3)",
    [name, topic, Date.now()]
  );
}

export async function updateRoomTopic(name, topic) {
  await pool.query("UPDATE rooms SET topic = $1 WHERE name = $2", [topic, name]);
}

export async function deleteRoom(name) {
  await pool.query("DELETE FROM messages WHERE room = $1", [name]);
  await pool.query("DELETE FROM rooms WHERE name = $1", [name]);
}

export async function getRoomHistory(room, limit = 80) {
  const result = await pool.query(
    `
      SELECT id, type, nickname, text, created_at AS "createdAt"
      FROM messages
      WHERE room = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [room, limit]
  );

  return result.rows.reverse();
}

export async function saveMessage(room, message) {
  await pool.query(
    `
      INSERT INTO messages (id, room, type, nickname, text, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        room = EXCLUDED.room,
        type = EXCLUDED.type,
        nickname = EXCLUDED.nickname,
        text = EXCLUDED.text,
        created_at = EXCLUDED.created_at
    `,
    [message.id, room, message.type, message.nickname, message.text, message.createdAt]
  );
}

export async function trimRoomHistory(room, limit = 250) {
  await pool.query(
    `
      DELETE FROM messages
      WHERE room = $1
        AND id NOT IN (
          SELECT id FROM messages
          WHERE room = $1
          ORDER BY created_at DESC
          LIMIT $2
        )
    `,
    [room, limit]
  );
}

export async function isBanned(nickname) {
  const result = await pool.query("SELECT 1 FROM bans WHERE nickname = $1", [nickname]);
  return result.rowCount > 0;
}

export async function banNickname(nickname, displayName, bannedBy) {
  await pool.query(
    `
      INSERT INTO bans (nickname, display_name, banned_by, created_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (nickname) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        banned_by = EXCLUDED.banned_by,
        created_at = EXCLUDED.created_at
    `,
    [nickname, displayName, bannedBy, Date.now()]
  );
}

export async function unbanNickname(nickname) {
  await pool.query("DELETE FROM bans WHERE nickname = $1", [nickname]);
}
