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
  getPrivateMessageById,
  getReportById,
  getRoomHistory,
  getRooms,
  initDatabase,
  isBanned,
  hasOpenReport,
  listAccounts,
  listModerationLogs,
  listPrivateBlocks,
  listPrivateMessagesForAccount,
  listReports,
  markPrivateMessagesRead,
  createReport,
  getMessageById,
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
  updateReportStatus,
  updateRoomTopic,
} = database;
