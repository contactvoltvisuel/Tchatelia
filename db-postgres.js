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
      author_id TEXT NOT NULL DEFAULT '',
      author_gender TEXT NOT NULL DEFAULT 'other',
      author_role TEXT NOT NULL DEFAULT 'user',
      reply_to_id TEXT NOT NULL DEFAULT '',
      reply_to_nickname TEXT NOT NULL DEFAULT '',
      reply_to_text TEXT NOT NULL DEFAULT '',
      reply_to_deleted BOOLEAN NOT NULL DEFAULT FALSE,
      edited_at BIGINT,
      deleted_at BIGINT,
      deleted_by TEXT NOT NULL DEFAULT '',
      reaction_data TEXT NOT NULL DEFAULT '{}',
      pinned_at BIGINT,
      pinned_by TEXT NOT NULL DEFAULT '',
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bans (
      nickname TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      banned_by TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS temporary_mutes (
      subject_key TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      reason TEXT NOT NULL,
      muted_by TEXT NOT NULL,
      expires_at BIGINT NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS temporary_mutes_expires_idx
      ON temporary_mutes (expires_at);

    CREATE TABLE IF NOT EXISTS accounts (
      nickname TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL,
      gender TEXT NOT NULL DEFAULT 'other',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      bio TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      private_messages_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      email TEXT NOT NULL DEFAULT '',
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS message_favorites (
      account_nickname TEXT NOT NULL REFERENCES accounts(nickname) ON DELETE CASCADE,
      message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      created_at BIGINT NOT NULL,
      PRIMARY KEY (account_nickname, message_id)
    );

    CREATE INDEX IF NOT EXISTS message_favorites_account_idx
      ON message_favorites (account_nickname, created_at DESC);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash TEXT PRIMARY KEY,
      account_nickname TEXT NOT NULL REFERENCES accounts(nickname) ON DELETE CASCADE,
      expires_at BIGINT NOT NULL,
      used_at BIGINT,
      created_at BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS password_reset_account_idx
      ON password_reset_tokens (account_nickname, created_at DESC);

    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      token_hash TEXT PRIMARY KEY,
      account_nickname TEXT NOT NULL REFERENCES accounts(nickname) ON DELETE CASCADE,
      email TEXT NOT NULL,
      expires_at BIGINT NOT NULL,
      used_at BIGINT,
      created_at BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS email_verification_account_idx
      ON email_verification_tokens (account_nickname, created_at DESC);

    CREATE TABLE IF NOT EXISTS account_sessions (
      token_hash TEXT PRIMARY KEY,
      account_nickname TEXT NOT NULL REFERENCES accounts(nickname) ON DELETE CASCADE,
      expires_at BIGINT NOT NULL,
      created_at BIGINT NOT NULL,
      last_used_at BIGINT NOT NULL
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
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS moderation_incidents (
      id TEXT PRIMARY KEY,
      subject_key TEXT NOT NULL,
      target_display TEXT NOT NULL,
      room TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      automatic_action TEXT NOT NULL,
      content_snapshot TEXT NOT NULL,
      violation_count INTEGER NOT NULL,
      status TEXT NOT NULL,
      handled_by TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      handled_at BIGINT
    );

    CREATE INDEX IF NOT EXISTS moderation_incidents_status_created_idx
      ON moderation_incidents (status, created_at DESC);

    CREATE TABLE IF NOT EXISTS security_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      identity_hash TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS security_events_created_idx
      ON security_events (created_at DESC);

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
  await pool.query(
    "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS private_messages_enabled BOOLEAN NOT NULL DEFAULT TRUE"
  );
  await pool.query("ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT ''");
  await pool.query(
    "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE"
  );
  await pool.query(
    "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS gender TEXT NOT NULL DEFAULT 'other'"
  );
  await pool.query("ALTER TABLE accounts ALTER COLUMN email_verified SET DEFAULT FALSE");
  await pool.query(
    "CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_unique_idx ON accounts(email) WHERE email <> ''"
  );
  await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS author_id TEXT NOT NULL DEFAULT ''");
  await pool.query(
    "ALTER TABLE messages ADD COLUMN IF NOT EXISTS author_gender TEXT NOT NULL DEFAULT 'other'"
  );
  await pool.query(
    "ALTER TABLE messages ADD COLUMN IF NOT EXISTS author_role TEXT NOT NULL DEFAULT 'user'"
  );
  await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id TEXT NOT NULL DEFAULT ''");
  await pool.query(
    "ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_nickname TEXT NOT NULL DEFAULT ''"
  );
  await pool.query(
    "ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_text TEXT NOT NULL DEFAULT ''"
  );
  await pool.query(
    "ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_deleted BOOLEAN NOT NULL DEFAULT FALSE"
  );
  await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at BIGINT");
  await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at BIGINT");
  await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_by TEXT NOT NULL DEFAULT ''");
  await pool.query(
    "ALTER TABLE messages ADD COLUMN IF NOT EXISTS reaction_data TEXT NOT NULL DEFAULT '{}'"
  );
  await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_at BIGINT");
  await pool.query("ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_by TEXT NOT NULL DEFAULT ''");
  await pool.query(`
    UPDATE messages
    SET author_role = accounts.role
    FROM accounts
    WHERE messages.author_id = 'account:' || accounts.nickname
  `);

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
      SELECT nickname, display_name AS "displayName", password_hash AS "passwordHash", salt, role,
        gender, active,
        bio, avatar_url AS "avatarUrl",
        private_messages_enabled AS "privateMessagesEnabled", email,
        email_verified AS "emailVerified",
        created_at AS "createdAt"
      FROM accounts
      WHERE nickname = $1
    `,
    [nickname]
  );
  return result.rows[0];
}

export async function getAccountByEmail(email) {
  const result = await pool.query(
    `
      SELECT nickname, display_name AS "displayName", password_hash AS "passwordHash", salt, role,
        gender, active,
        bio, avatar_url AS "avatarUrl",
        private_messages_enabled AS "privateMessagesEnabled", email,
        email_verified AS "emailVerified",
        created_at AS "createdAt"
      FROM accounts
      WHERE email = $1
    `,
    [email]
  );
  return result.rows[0];
}

export async function listAccounts() {
  const result = await pool.query(`
    SELECT nickname, display_name AS "displayName", role, gender, active,
      private_messages_enabled AS "privateMessagesEnabled",
      created_at AS "createdAt"
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

export async function createModerationIncident(incident) {
  await pool.query(
    `
      INSERT INTO moderation_incidents (
        id, subject_key, target_display, room, category, severity,
        automatic_action, content_snapshot, violation_count, status,
        handled_by, created_at, handled_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', '', $10, NULL)
    `,
    [
      incident.id,
      incident.subjectKey,
      incident.targetDisplay,
      incident.room,
      incident.category,
      incident.severity,
      incident.automaticAction,
      incident.contentSnapshot,
      incident.violationCount,
      incident.createdAt,
    ]
  );
}

export async function listModerationIncidents(limit = 100) {
  const result = await pool.query(
    `
      SELECT id, target_display AS "targetDisplay", room, category, severity,
        automatic_action AS "automaticAction", content_snapshot AS "contentSnapshot",
        violation_count AS "violationCount", status, handled_by AS "handledBy",
        created_at AS "createdAt", handled_at AS "handledAt"
      FROM moderation_incidents
      ORDER BY CASE WHEN status = 'open' THEN 0 ELSE 1 END, created_at DESC
      LIMIT $1
    `,
    [limit]
  );
  return result.rows;
}

export async function getModerationIncidentById(id) {
  const result = await pool.query(
    `
      SELECT id, target_display AS "targetDisplay", room, category, severity,
        automatic_action AS "automaticAction", content_snapshot AS "contentSnapshot",
        violation_count AS "violationCount", status, handled_by AS "handledBy",
        created_at AS "createdAt", handled_at AS "handledAt"
      FROM moderation_incidents
      WHERE id = $1
    `,
    [id]
  );
  return result.rows[0];
}

export async function updateModerationIncidentStatus(id, status, handledBy) {
  await pool.query(
    `
      UPDATE moderation_incidents
      SET status = $1, handled_by = $2, handled_at = $3
      WHERE id = $4
    `,
    [status, handledBy, Date.now(), id]
  );
  await pool.query(`
    DELETE FROM moderation_incidents
    WHERE status != 'open'
      AND id NOT IN (
        SELECT id FROM moderation_incidents
        ORDER BY created_at DESC
        LIMIT 1000
      )
  `);
  await pool.query(
    "DELETE FROM moderation_incidents WHERE status != 'open' AND handled_at < $1",
    [Date.now() - 730 * 24 * 60 * 60 * 1000]
  );
}

export async function listSecurityEvents(limit = 100) {
  const result = await pool.query(
    `
      SELECT id, event_type AS "eventType", identity_hash AS "identityHash",
        details, created_at AS "createdAt"
      FROM security_events
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [limit]
  );
  return result.rows;
}

export async function saveSecurityEvent(event) {
  await pool.query(
    `
      INSERT INTO security_events (id, event_type, identity_hash, details, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      event.id,
      event.eventType,
      event.identityHash,
      event.details,
      event.createdAt,
    ]
  );
  await pool.query(`
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
  return result.rows;
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
      SELECT private_blocks.blocked, private_blocks.created_at AS "createdAt",
        accounts.display_name AS "displayName"
      FROM private_blocks
      JOIN accounts ON accounts.nickname = private_blocks.blocked
      WHERE private_blocks.blocker = $1
      ORDER BY private_blocks.created_at DESC
    `,
    [blocker]
  );
  return result.rows;
}

export async function getMessageById(id) {
  const result = await pool.query(
    `
      SELECT id, room, type, nickname, text, author_id AS "authorId",
        author_gender AS gender, author_role AS role,
        reply_to_id AS "replyToId", reply_to_nickname AS "replyToNickname",
        reply_to_text AS "replyToText", reply_to_deleted AS "replyToDeleted",
        edited_at AS "editedAt", deleted_at AS "deletedAt", deleted_by AS "deletedBy",
        reaction_data AS "reactionData", pinned_at AS "pinnedAt", pinned_by AS "pinnedBy",
        created_at AS "createdAt"
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
      INSERT INTO accounts (
        nickname, display_name, password_hash, salt, role, gender, active, email,
        email_verified, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8, $9)
    `,
    [
      account.nickname,
      account.displayName,
      account.passwordHash,
      account.salt,
      account.role,
      account.gender || "other",
      account.email || "",
      Boolean(account.emailVerified),
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

export async function updateAccountSettings(nickname, settings) {
  await pool.query(
    `
      UPDATE accounts
      SET display_name = $1, private_messages_enabled = $2, email = $3,
        email_verified = $4
      WHERE nickname = $5
    `,
    [
      settings.displayName,
      settings.privateMessagesEnabled,
      settings.email,
      settings.emailVerified,
      nickname,
    ]
  );
}

export async function createEmailVerificationToken(token) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "DELETE FROM email_verification_tokens WHERE expires_at < $1 OR account_nickname = $2",
      [Date.now(), token.accountNickname]
    );
    await client.query(
      `
        INSERT INTO email_verification_tokens (
          token_hash, account_nickname, email, expires_at, used_at, created_at
        )
        VALUES ($1, $2, $3, $4, NULL, $5)
      `,
      [
        token.tokenHash,
        token.accountNickname,
        token.email,
        token.expiresAt,
        token.createdAt,
      ]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getEmailVerificationToken(tokenHash) {
  const result = await pool.query(
    `
      SELECT token_hash AS "tokenHash", account_nickname AS "accountNickname", email,
        expires_at AS "expiresAt", used_at AS "usedAt", created_at AS "createdAt"
      FROM email_verification_tokens
      WHERE token_hash = $1
    `,
    [tokenHash]
  );
  return result.rows[0];
}

export async function markEmailVerificationTokenUsed(tokenHash, usedAt) {
  await pool.query(
    `
      UPDATE email_verification_tokens
      SET used_at = $1
      WHERE token_hash = $2 AND used_at IS NULL
    `,
    [usedAt, tokenHash]
  );
}

export async function setAccountEmailVerified(nickname, verified) {
  await pool.query("UPDATE accounts SET email_verified = $1 WHERE nickname = $2", [
    verified,
    nickname,
  ]);
}

export async function clearAccountEmailTokens(nickname) {
  await pool.query("DELETE FROM password_reset_tokens WHERE account_nickname = $1", [nickname]);
  await pool.query("DELETE FROM email_verification_tokens WHERE account_nickname = $1", [
    nickname,
  ]);
}

export async function createAccountSession(session) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM account_sessions WHERE expires_at < $1", [Date.now()]);
    await client.query(
      `
        INSERT INTO account_sessions (
          token_hash, account_nickname, expires_at, created_at, last_used_at
        )
        VALUES ($1, $2, $3, $4, $4)
      `,
      [
        session.tokenHash,
        session.accountNickname,
        session.expiresAt,
        session.createdAt,
      ]
    );
    await client.query(
      `
        DELETE FROM account_sessions
        WHERE token_hash IN (
          SELECT token_hash
          FROM account_sessions
          WHERE account_nickname = $1
          ORDER BY created_at DESC
          OFFSET 10
        )
      `,
      [session.accountNickname]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getAccountSession(tokenHash) {
  const result = await pool.query(
    `
      SELECT token_hash AS "tokenHash", account_nickname AS "accountNickname",
        expires_at AS "expiresAt", created_at AS "createdAt",
        last_used_at AS "lastUsedAt"
      FROM account_sessions
      WHERE token_hash = $1
    `,
    [tokenHash]
  );
  return result.rows[0];
}

export async function touchAccountSession(tokenHash, lastUsedAt) {
  await pool.query(
    "UPDATE account_sessions SET last_used_at = $1 WHERE token_hash = $2",
    [lastUsedAt, tokenHash]
  );
}

export async function deleteAccountSession(tokenHash) {
  await pool.query("DELETE FROM account_sessions WHERE token_hash = $1", [tokenHash]);
}

export async function deleteAccountSessions(nickname) {
  await pool.query("DELETE FROM account_sessions WHERE account_nickname = $1", [nickname]);
}

export async function createPasswordResetToken(token) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "DELETE FROM password_reset_tokens WHERE expires_at < $1 OR account_nickname = $2",
      [Date.now(), token.accountNickname]
    );
    await client.query(
      `
        INSERT INTO password_reset_tokens (
          token_hash, account_nickname, expires_at, used_at, created_at
        )
        VALUES ($1, $2, $3, NULL, $4)
      `,
      [token.tokenHash, token.accountNickname, token.expiresAt, token.createdAt]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getPasswordResetToken(tokenHash) {
  const result = await pool.query(
    `
      SELECT token_hash AS "tokenHash", account_nickname AS "accountNickname",
        expires_at AS "expiresAt", used_at AS "usedAt", created_at AS "createdAt"
      FROM password_reset_tokens
      WHERE token_hash = $1
    `,
    [tokenHash]
  );
  return result.rows[0];
}

export async function markPasswordResetTokenUsed(tokenHash, usedAt) {
  await pool.query(
    `
      UPDATE password_reset_tokens
      SET used_at = $1
      WHERE token_hash = $2 AND used_at IS NULL
    `,
    [usedAt, tokenHash]
  );
}

export async function deleteAccount(nickname) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const accountId = `account:${nickname}`;
    const reactionResult = await client.query(
      "SELECT id, reaction_data AS \"reactionData\" FROM messages WHERE reaction_data <> '{}'"
    );
    for (const row of reactionResult.rows) {
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
      if (changed) {
        await client.query("UPDATE messages SET reaction_data = $1 WHERE id = $2", [
          JSON.stringify(reactions),
          row.id,
        ]);
      }
    }
    await client.query("DELETE FROM reports WHERE reporter = $1", [nickname]);
    await client.query("DELETE FROM password_reset_tokens WHERE account_nickname = $1", [
      nickname,
    ]);
    await client.query("DELETE FROM email_verification_tokens WHERE account_nickname = $1", [
      nickname,
    ]);
    await client.query("DELETE FROM account_sessions WHERE account_nickname = $1", [nickname]);
    await client.query("DELETE FROM temporary_mutes WHERE subject_key = $1", [
      `account:${nickname}`,
    ]);
    await client.query("DELETE FROM message_favorites WHERE account_nickname = $1", [nickname]);
    await client.query(
      "DELETE FROM private_blocks WHERE blocker = $1 OR blocked = $1",
      [nickname]
    );
    await client.query(
      "DELETE FROM private_messages WHERE sender = $1 OR recipient = $1",
      [nickname]
    );
    await client.query("DELETE FROM accounts WHERE nickname = $1", [nickname]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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
  await pool.query(
    "DELETE FROM message_favorites WHERE message_id IN (SELECT id FROM messages WHERE room = $1)",
    [name]
  );
  await pool.query("DELETE FROM messages WHERE room = $1", [name]);
  await pool.query("DELETE FROM rooms WHERE name = $1", [name]);
}

export async function getRoomHistory(room, limit = 80) {
  const result = await pool.query(
    `
      SELECT id, type, nickname, text, author_id AS "authorId",
        author_gender AS gender, author_role AS role,
        reply_to_id AS "replyToId", reply_to_nickname AS "replyToNickname",
        reply_to_text AS "replyToText", reply_to_deleted AS "replyToDeleted",
        edited_at AS "editedAt", deleted_at AS "deletedAt", deleted_by AS "deletedBy",
        reaction_data AS "reactionData", pinned_at AS "pinnedAt", pinned_by AS "pinnedBy",
        created_at AS "createdAt"
      FROM messages
      WHERE id IN (
        SELECT id FROM messages
        WHERE room = $1
        ORDER BY created_at DESC
        LIMIT $2
      )
        OR (room = $1 AND pinned_at IS NOT NULL)
      ORDER BY created_at ASC
    `,
    [room, limit]
  );

  return result.rows.reverse();
}

export async function saveMessage(room, message) {
  await pool.query(
    `
      INSERT INTO messages (
        id, room, type, nickname, text, author_id, author_gender, author_role,
        reply_to_id, reply_to_nickname, reply_to_text, reply_to_deleted,
        edited_at, deleted_at, deleted_by, reaction_data, pinned_at, pinned_by, created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
      ON CONFLICT (id) DO UPDATE SET
        room = EXCLUDED.room,
        type = EXCLUDED.type,
        nickname = EXCLUDED.nickname,
        text = EXCLUDED.text,
        author_id = EXCLUDED.author_id,
        author_gender = EXCLUDED.author_gender,
        author_role = EXCLUDED.author_role,
        reply_to_id = EXCLUDED.reply_to_id,
        reply_to_nickname = EXCLUDED.reply_to_nickname,
        reply_to_text = EXCLUDED.reply_to_text,
        reply_to_deleted = EXCLUDED.reply_to_deleted,
        edited_at = EXCLUDED.edited_at,
        deleted_at = EXCLUDED.deleted_at,
        deleted_by = EXCLUDED.deleted_by,
        reaction_data = EXCLUDED.reaction_data,
        pinned_at = EXCLUDED.pinned_at,
        pinned_by = EXCLUDED.pinned_by,
        created_at = EXCLUDED.created_at
    `,
    [
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
      Boolean(message.replyToDeleted),
      message.editedAt || null,
      message.deletedAt || null,
      message.deletedBy || "",
      message.reactionData || "{}",
      message.pinnedAt || null,
      message.pinnedBy || "",
      message.createdAt,
    ]
  );
}

export async function updateMessageText(id, text, editedAt) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
        UPDATE messages
        SET text = $1, edited_at = $2
        WHERE id = $3 AND deleted_at IS NULL
      `,
      [text, editedAt, id]
    );
    await client.query(
      `
        UPDATE messages
        SET reply_to_text = $1
        WHERE reply_to_id = $2 AND reply_to_deleted = FALSE
      `,
      [text.slice(0, 160), id]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteMessageContent(id, deletedAt, deletedBy) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
        UPDATE messages
        SET text = '', deleted_at = $1, deleted_by = $2, reaction_data = '{}',
          pinned_at = NULL, pinned_by = ''
        WHERE id = $3 AND deleted_at IS NULL
      `,
      [deletedAt, deletedBy, id]
    );
    await client.query(
      `
        UPDATE messages
        SET reply_to_text = '', reply_to_deleted = TRUE
        WHERE reply_to_id = $1
      `,
      [id]
    );
    await client.query("DELETE FROM message_favorites WHERE message_id = $1", [id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateMessageReactions(id, reactionData) {
  await pool.query(
    `
      UPDATE messages
      SET reaction_data = $1
      WHERE id = $2 AND deleted_at IS NULL
    `,
    [reactionData, id]
  );
}

export async function setMessageFavorite(accountNickname, messageId, favorite) {
  if (favorite) {
    await pool.query(
      `
        INSERT INTO message_favorites (account_nickname, message_id, created_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (account_nickname, message_id) DO NOTHING
      `,
      [accountNickname, messageId, Date.now()]
    );
    return;
  }
  await pool.query(
    "DELETE FROM message_favorites WHERE account_nickname = $1 AND message_id = $2",
    [accountNickname, messageId]
  );
}

export async function listFavoriteMessageIds(accountNickname) {
  const result = await pool.query(
    "SELECT message_id AS \"messageId\" FROM message_favorites WHERE account_nickname = $1",
    [accountNickname]
  );
  return result.rows.map((row) => row.messageId);
}

export async function setPinnedMessage(room, messageId, pinnedAt, pinnedBy) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE messages SET pinned_at = NULL, pinned_by = '' WHERE room = $1",
      [room]
    );
    if (messageId) {
      await client.query(
        `
          UPDATE messages
          SET pinned_at = $1, pinned_by = $2
          WHERE id = $3 AND room = $4 AND deleted_at IS NULL AND type != 'system'
        `,
        [pinnedAt, pinnedBy, messageId, room]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function trimRoomHistory(room, limit = 250) {
  await pool.query(
    `
      DELETE FROM message_favorites
      WHERE message_id IN (
          SELECT id FROM messages
          WHERE room = $1
            AND pinned_at IS NULL
            AND id NOT IN (
            SELECT id FROM messages
            WHERE room = $1
            ORDER BY created_at DESC
            LIMIT $2
          )
      )
    `,
    [room, limit]
  );
  await pool.query(
    `
      DELETE FROM messages
      WHERE room = $1
        AND pinned_at IS NULL
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

export async function getActiveTemporaryMute(subjectKey) {
  const now = Date.now();
  await pool.query("DELETE FROM temporary_mutes WHERE expires_at <= $1", [now]);
  const result = await pool.query(
    `
      SELECT subject_key AS "subjectKey", display_name AS "displayName", reason,
        muted_by AS "mutedBy", expires_at AS "expiresAt", created_at AS "createdAt"
      FROM temporary_mutes
      WHERE subject_key = $1 AND expires_at > $2
    `,
    [subjectKey, now]
  );
  return result.rows[0];
}

export async function saveTemporaryMute(mute) {
  await pool.query(
    `
      INSERT INTO temporary_mutes (
        subject_key, display_name, reason, muted_by, expires_at, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (subject_key) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        reason = EXCLUDED.reason,
        muted_by = EXCLUDED.muted_by,
        expires_at = EXCLUDED.expires_at,
        created_at = EXCLUDED.created_at
    `,
    [
      mute.subjectKey,
      mute.displayName,
      mute.reason,
      mute.mutedBy,
      mute.expiresAt,
      mute.createdAt,
    ]
  );
}

export async function clearTemporaryMute(subjectKey) {
  await pool.query("DELETE FROM temporary_mutes WHERE subject_key = $1", [subjectKey]);
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
