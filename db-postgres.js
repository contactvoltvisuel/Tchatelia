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
    SELECT nickname, display_name AS "displayName", role, active, bio,
      avatar_url AS "avatarUrl", created_at AS "createdAt"
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
