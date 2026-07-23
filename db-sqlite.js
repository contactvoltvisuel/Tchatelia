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
  `);

  try {
    db.exec("ALTER TABLE accounts ADD COLUMN active INTEGER NOT NULL DEFAULT 1");
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
      SELECT nickname, display_name AS displayName, password_hash AS passwordHash, salt, role, active
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
