import "./config.js";

const database = process.env.DATABASE_URL
  ? await import("./db-postgres.js")
  : await import("./db-sqlite.js");

export const {
  banNickname,
  createRoom,
  deleteRoom,
  getDatabaseLabel,
  getRoomHistory,
  getRooms,
  initDatabase,
  isBanned,
  saveMessage,
  trimRoomHistory,
  unbanNickname,
  updateRoomTopic,
} = database;
