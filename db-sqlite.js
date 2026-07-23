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
