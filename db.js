import "./config.js";

const database = process.env.DATABASE_URL
  ? await import("./db-postgres.js")
  : await import("./db-sqlite.js");

export const {
  banNickname,
  createRoom,
  createAccount,
  deleteRoom,
  getAccountByNickname,
  getDatabaseLabel,
  getPrivateBlockState,
  getPrivateConversation,
  getRoomHistory,
  getRooms,
  initDatabase,
  isBanned,
  listAccounts,
  listModerationLogs,
  listPrivateBlocks,
  listPrivateMessagesForAccount,
  markPrivateMessagesRead,
  savePrivateMessage,
  saveMessage,
  saveModerationLog,
  setPrivateBlock,
  trimRoomHistory,
  unbanNickname,
  setAccountActive,
  updateAccountPassword,
  updateAccountProfile,
  updateAccountRole,
  updateRoomTopic,
} = database;
