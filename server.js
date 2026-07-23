import "./config.js";
import express from "express";
import { createServer } from "node:http";
import { randomBytes, timingSafeEqual, scrypt as scryptCallback } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import {
  banNickname,
  createAccount,
  createRoom,
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
  setAccountActive,
  setPrivateBlock,
  trimRoomHistory,
  unbanNickname,
  updateAccountPassword,
  updateAccountProfile,
  updateAccountRole,
  updateRoomTopic,
} from "./db.js";

const scrypt = promisify(scryptCallback);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "public");
const publicIndex = join(publicDir, "index.html");
const rootIndex = join(__dirname, "index.html");

const PORT = process.env.PORT || 3000;
const MAX_HISTORY = 80;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "tchatelia-admin";
const SPAM_WINDOW_MS = 10_000;
const SPAM_MAX_MESSAGES = 5;
const SPAM_COOLDOWN_MS = 15_000;
const DUPLICATE_COOLDOWN_MS = 8_000;
const MODERATION_ROLES = new Set(["admin", "moderator"]);

await initDatabase();

const rooms = new Map(
  await Promise.all(
    (await getRooms()).map(async (room) => [
      room.name,
      {
        topic: room.topic,
        history: await getRoomHistory(room.name, MAX_HISTORY),
      },
    ])
  )
);

const users = new Map();

app.use(express.static(publicDir));
app.use(express.static(__dirname));

app.get("/", (request, response) => {
  response.sendFile(existsSync(publicIndex) ? publicIndex : rootIndex);
});

app.get("/avatar/:nickname", async (request, response) => {
  const account = await getAccountByNickname(normalizeName(request.params.nickname));
  const avatarUrl = account?.avatarUrl || "";

  if (!avatarUrl) {
    response.sendStatus(404);
    return;
  }

  if (avatarUrl.startsWith("data:image/")) {
    const match = avatarUrl.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      response.sendStatus(404);
      return;
    }

    response.set("Cache-Control", "no-store");
    response.type(`image/${match[1]}`).send(Buffer.from(match[2], "base64"));
    return;
  }

  response.redirect(302, avatarUrl);
});

io.on("connection", (socket) => {
  socket.on("join", async ({ nickname, room, adminPassword, accountPassword, authMode }, callback) => {
    const cleanNickname = cleanName(nickname);
    const normalizedNickname = normalizeName(cleanNickname);
    const cleanRoom = rooms.has(room) ? room : "accueil";
    const wantsAdmin = Boolean(String(adminPassword || "").trim());
    const isAdmin = String(adminPassword || "") === ADMIN_PASSWORD;
    const cleanAuthMode = ["guest", "login", "register"].includes(authMode) ? authMode : "guest";
    const cleanAccountPassword = String(accountPassword || "");

    if (wantsAdmin && !isAdmin) {
      callback?.({
        ok: false,
        error: "Mot de passe admin incorrect.",
      });
      return;
    }

    if (cleanAuthMode === "register") {
      if (cleanAccountPassword.length < 6) {
        callback?.({
          ok: false,
          error: "Le mot de passe du compte doit faire au moins 6 caracteres.",
        });
        return;
      }

      const existingAccount = await getAccountByNickname(normalizedNickname);
      if (existingAccount) {
        callback?.({
          ok: false,
          error: "Ce pseudo est deja reserve. Connecte-toi avec le mot de passe du compte.",
        });
        return;
      }

      const passwordRecord = await hashPassword(cleanAccountPassword);
      await createAccount({
        nickname: normalizedNickname,
        displayName: cleanNickname,
        passwordHash: passwordRecord.passwordHash,
        salt: passwordRecord.salt,
        role: isAdmin ? "admin" : "user",
      });
    }

    const account = await getAccountByNickname(normalizedNickname);

    if (account && cleanAuthMode !== "register") {
      if (!account.active) {
        callback?.({
          ok: false,
          error: "Ce compte est desactive.",
        });
        return;
      }

      if (cleanAuthMode !== "login") {
        callback?.({
          ok: false,
          error: "Ce pseudo est reserve. Utilise la connexion compte.",
        });
        return;
      }

      if (!(await verifyPassword(cleanAccountPassword, account))) {
        callback?.({
          ok: false,
          error: "Mot de passe du compte incorrect.",
        });
        return;
      }
    }

    if (!account && cleanAuthMode === "login") {
      callback?.({
        ok: false,
        error: "Aucun compte n'existe avec ce pseudo.",
      });
      return;
    }

    const role = account?.role || (isAdmin ? "admin" : "user");
    const displayName = account?.displayName || cleanNickname;

    if (await isBanned(normalizedNickname)) {
      callback?.({
        ok: false,
        error: "Ce pseudo est banni du chat.",
      });
      return;
    }

    users.set(socket.id, {
      nickname: displayName,
      room: cleanRoom,
      role,
      account: Boolean(account || cleanAuthMode === "register"),
      accountNickname: account || cleanAuthMode === "register" ? normalizedNickname : null,
      bio: account?.bio || "",
      avatarUrl: account?.avatarUrl || "",
      memberSince: account?.createdAt || Date.now(),
      messageTimes: [],
      lastMessage: "",
      cooldownUntil: 0,
      joinedAt: Date.now(),
    });

    socket.join(cleanRoom);
    socket.emit("rooms", getRoomList());
    socket.emit("history", rooms.get(cleanRoom).history);
    await sendSystem(cleanRoom, `${displayName}${formatRoleSuffix(role)} vient d'entrer dans le salon.`);
    publishUsers(cleanRoom);
    if (role === "admin") {
      await sendAccountList(socket);
      await sendModerationLogs(socket);
    }
    if (account || cleanAuthMode === "register") {
      await sendPrivateState(socket, normalizedNickname);
    }

    callback?.({
      ok: true,
      nickname: displayName,
      room: cleanRoom,
      role,
      account: Boolean(account || cleanAuthMode === "register"),
      accountNickname: account || cleanAuthMode === "register" ? normalizedNickname : "",
      topic: rooms.get(cleanRoom).topic,
    });
  });

  socket.on("switch-room", async (room, callback) => {
    const user = users.get(socket.id);
    if (!user) return;

    const nextRoom = rooms.has(room) ? room : "accueil";
    if (nextRoom === user.room) return;

    const previousRoom = user.room;
    socket.leave(previousRoom);
    await sendSystem(previousRoom, `${user.nickname} a quitte le salon.`);
    publishUsers(previousRoom);

    user.room = nextRoom;
    socket.join(nextRoom);
    socket.emit("history", rooms.get(nextRoom).history);
    await sendSystem(nextRoom, `${user.nickname} vient d'entrer dans le salon.`);
    publishUsers(nextRoom);

    callback?.({
      ok: true,
      room: nextRoom,
      topic: rooms.get(nextRoom).topic,
    });
  });

  socket.on("message", async (text) => {
    const user = users.get(socket.id);
    if (!user) return;

    const messageText = String(text || "").trim().slice(0, 500);
    if (!messageText) return;

    if (messageText === "/clear") {
      socket.emit("history", []);
      return;
    }

    if (messageText === "/help") {
      socket.emit("message", {
        id: crypto.randomUUID(),
        type: "system",
        nickname: "Systeme",
        text:
          user.role === "admin"
            ? "Commandes admin : /me texte, /clear, /kick pseudo, /ban pseudo, /unban pseudo"
            : user.role === "moderator"
              ? "Commandes moderation : /me texte, /clear, /kick pseudo, /ban pseudo, /unban pseudo"
            : "Commandes : /me texte, /clear, /admin motdepasse",
        createdAt: Date.now(),
      });
      return;
    }

    if (messageText.startsWith("/admin ")) {
      const password = messageText.slice(7).trim();

      if (password !== ADMIN_PASSWORD) {
        socket.emit("message", {
          id: crypto.randomUUID(),
          type: "system",
          nickname: "Systeme",
          text: "Mot de passe admin incorrect.",
          createdAt: Date.now(),
        });
        return;
      }

      user.role = "admin";
      await sendSystem(user.room, `${user.nickname} est maintenant admin.`);
      publishUsers(user.room);
      return;
    }

    if (messageText.startsWith("/kick ")) {
      await handleModeration(socket, user, "kick", messageText.slice(6));
      return;
    }

    if (messageText.startsWith("/ban ")) {
      await handleModeration(socket, user, "ban", messageText.slice(5));
      return;
    }

    if (messageText.startsWith("/unban ")) {
      await handleModeration(socket, user, "unban", messageText.slice(7));
      return;
    }

    const spamCheck = checkSpam(user, messageText);
    if (!spamCheck.ok) {
      socket.emit("message", {
        id: crypto.randomUUID(),
        type: "system",
        nickname: "Systeme",
        text: spamCheck.message,
        createdAt: Date.now(),
      });
      return;
    }

    if (messageText.startsWith("/me ")) {
      await addMessage(user.room, {
        id: crypto.randomUUID(),
        type: "action",
        nickname: user.nickname,
        text: messageText.slice(4),
        createdAt: Date.now(),
      });
      return;
    }

    await addMessage(user.room, {
      id: crypto.randomUUID(),
      type: "message",
      nickname: user.nickname,
      text: messageText,
      createdAt: Date.now(),
    });
  });

  socket.on("admin-action", async ({ action, nickname }) => {
    const user = users.get(socket.id);
    if (!user) return;

    const allowedActions = new Set(["kick", "ban", "unban"]);
    if (!allowedActions.has(action)) return;

    await handleModeration(socket, user, action, nickname);
  });

  socket.on("room-action", async ({ action, name, topic }) => {
    const user = users.get(socket.id);
    if (!user || user.role !== "admin") {
      socket.emit("message", {
        id: crypto.randomUUID(),
        type: "system",
        nickname: "Systeme",
        text: "Gestion des salons reservee aux admins.",
        createdAt: Date.now(),
      });
      return;
    }

    await handleRoomAction(socket, user, action, name, topic);
  });

  socket.on("account-action", async ({ action, nickname, role, password }) => {
    const user = users.get(socket.id);
    if (!user || user.role !== "admin") {
      emitPrivateSystem(socket, "Gestion des comptes reservee aux admins.");
      return;
    }

    await handleAccountAction(socket, user, action, nickname, role, password);
  });

  socket.on("moderation-log-action", async ({ action }) => {
    const user = users.get(socket.id);
    if (!user || user.role !== "admin") {
      emitPrivateSystem(socket, "Journal de moderation reserve aux admins.");
      return;
    }

    if (action === "list") await sendModerationLogs(socket);
  });

  socket.on("profile-action", async ({ action, nickname, bio, avatarUrl } = {}) => {
    const user = users.get(socket.id);
    if (!user) return;

    if (action === "get") {
      await sendProfile(socket, user, nickname);
      return;
    }

    if (action !== "update") return;
    if (!user.accountNickname) {
      emitPrivateSystem(socket, "Cree un compte pour personnaliser ton profil.");
      return;
    }

    const cleanBio = String(bio || "").trim().slice(0, 180);
    const cleanAvatar = cleanAvatarUrl(avatarUrl);
    if (cleanAvatar === null) {
      emitPrivateSystem(socket, "Le lien de l'avatar doit etre une adresse http ou https valide.");
      return;
    }

    await updateAccountProfile(user.accountNickname, {
      bio: cleanBio,
      avatarUrl: cleanAvatar,
    });
    updateConnectedAccount(user.accountNickname, {
      bio: cleanBio,
      avatarUrl: cleanAvatar,
    });
    for (const room of rooms.keys()) publishUsers(room);
    emitPrivateSystem(socket, "Ton profil a ete mis a jour.");
    await sendProfile(socket, user, user.nickname);
  });

  socket.on("private-action", async (payload = {}) => {
    const user = users.get(socket.id);
    if (!user) return;

    if (!user.accountNickname) {
      emitPrivateError(socket, "Les messages prives sont reserves aux comptes inscrits.");
      return;
    }

    await handlePrivateAction(socket, user, payload);
  });

  socket.on("disconnect", async () => {
    const user = users.get(socket.id);
    if (!user) return;

    users.delete(socket.id);
    await sendSystem(user.room, `${user.nickname} a quitte le salon.`);
    publishUsers(user.room);
  });
});

function cleanName(value) {
  const fallback = `Invite${Math.floor(1000 + Math.random() * 9000)}`;
  return (
    String(value || fallback)
      .replace(/[^\p{L}\p{N}_-]/gu, "")
      .slice(0, 18) || fallback
  );
}

function normalizeName(value) {
  return String(value || "").trim().toLocaleLowerCase("fr-FR");
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);

  return {
    salt,
    passwordHash: derivedKey.toString("hex"),
  };
}

async function verifyPassword(password, account) {
  const derivedKey = await scrypt(password, account.salt, 64);
  const storedHash = Buffer.from(account.passwordHash, "hex");

  return storedHash.length === derivedKey.length && timingSafeEqual(storedHash, derivedKey);
}

function findUserByNickname(nickname) {
  const normalized = normalizeName(nickname);
  return [...users.entries()].find(([, user]) => normalizeName(user.nickname) === normalized);
}

function cleanRoomName(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("fr-FR")
    .replace(/^#/, "")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 24);
}

function cleanTopic(value) {
  return String(value || "Salon public Tchatelia.").trim().slice(0, 90);
}

function cleanAvatarUrl(value) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return "";

  const imageData = cleanValue.match(
    /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/
  );
  if (imageData) {
    if (Buffer.byteLength(imageData[2], "base64") > 250 * 1024) return null;
    return cleanValue;
  }

  if (cleanValue.length > 500) return null;

  try {
    const url = new URL(cleanValue);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function sendProfile(socket, viewer, rawNickname) {
  const nickname = normalizeName(rawNickname);
  if (!nickname) {
    emitPrivateSystem(socket, "Profil introuvable.");
    return;
  }

  const account = await getAccountByNickname(nickname);
  if (account) {
    socket.emit("profile", {
      accountNickname: account.nickname,
      nickname: account.displayName,
      role: account.role,
      bio: account.bio,
      avatarUrl: account.avatarUrl,
      createdAt: account.createdAt,
      account: true,
      isOwn: viewer.accountNickname === account.nickname,
    });
    return;
  }

  const targetEntry = findUserByNickname(rawNickname);
  if (!targetEntry) {
    emitPrivateSystem(socket, "Profil introuvable.");
    return;
  }

  const target = targetEntry[1];
  socket.emit("profile", {
    accountNickname: "",
    nickname: target.nickname,
    role: target.role,
    bio: "",
    avatarUrl: "",
    createdAt: target.memberSince,
    account: false,
    isOwn: false,
  });
}

async function handlePrivateAction(socket, user, payload) {
  const action = String(payload.action || "");

  if (action === "list") {
    await sendPrivateState(socket, user.accountNickname);
    return;
  }

  const targetNickname = normalizeName(payload.nickname);
  if (!targetNickname || targetNickname === user.accountNickname) {
    emitPrivateError(socket, "Choisis un autre compte pour cette conversation.");
    return;
  }

  const targetAccount = await getAccountByNickname(targetNickname);
  if (!targetAccount) {
    emitPrivateError(socket, "Ce compte n'existe pas.");
    return;
  }

  if (action === "open") {
    await sendPrivateConversation(socket, user.accountNickname, targetAccount);
    return;
  }

  if (action === "mark-read") {
    await markPrivateMessagesRead(user.accountNickname, targetNickname, Date.now());
    await refreshPrivateStateForAccount(user.accountNickname);
    return;
  }

  if (action === "block" || action === "unblock") {
    await setPrivateBlock(user.accountNickname, targetNickname, action === "block");
    await sendPrivateConversation(socket, user.accountNickname, targetAccount);
    emitToAccount(targetNickname, "private-block-changed", {
      nickname: user.accountNickname,
    });
    return;
  }

  if (action !== "send") return;
  if (!targetAccount.active) {
    emitPrivateError(socket, "Ce compte est desactive.");
    return;
  }

  const text = String(payload.text || "").trim().slice(0, 500);
  if (!text) return;

  const blockState = await getPrivateBlockState(user.accountNickname, targetNickname);
  if (blockState.blockedByMe || blockState.blockedByThem) {
    emitPrivateError(socket, "Cette conversation est bloquee.");
    return;
  }

  const spamCheck = checkSpam(user, text);
  if (!spamCheck.ok) {
    emitPrivateError(socket, spamCheck.message);
    return;
  }

  const privateMessage = {
    id: crypto.randomUUID(),
    sender: user.accountNickname,
    recipient: targetNickname,
    text,
    createdAt: Date.now(),
  };
  await savePrivateMessage(privateMessage);

  emitToAccount(user.accountNickname, "private-message", {
    id: privateMessage.id,
    text,
    createdAt: privateMessage.createdAt,
    fromMe: true,
    counterpartAccount: targetNickname,
    counterpartNickname: targetAccount.displayName,
  });
  emitToAccount(targetNickname, "private-message", {
    id: privateMessage.id,
    text,
    createdAt: privateMessage.createdAt,
    fromMe: false,
    counterpartAccount: user.accountNickname,
    counterpartNickname: user.nickname,
  });

  await refreshPrivateStateForAccount(user.accountNickname);
  await refreshPrivateStateForAccount(targetNickname);
}

async function sendPrivateConversation(socket, accountNickname, targetAccount) {
  await markPrivateMessagesRead(accountNickname, targetAccount.nickname, Date.now());
  const [messages, blockState] = await Promise.all([
    getPrivateConversation(accountNickname, targetAccount.nickname, 80),
    getPrivateBlockState(accountNickname, targetAccount.nickname),
  ]);

  socket.emit("private-conversation", {
    participant: {
      accountNickname: targetAccount.nickname,
      nickname: targetAccount.displayName,
      role: targetAccount.role,
      avatarUrl: targetAccount.avatarUrl
        ? `/avatar/${encodeURIComponent(targetAccount.nickname)}`
        : "",
    },
    messages: messages.map((message) => ({
      id: message.id,
      text: message.text,
      createdAt: message.createdAt,
      fromMe: message.sender === accountNickname,
    })),
    blockedByMe: blockState.blockedByMe,
    blockedByThem: blockState.blockedByThem,
    available: Boolean(targetAccount.active),
  });

  await refreshPrivateStateForAccount(accountNickname);
}

async function buildPrivateState(accountNickname) {
  const [messages, blocks] = await Promise.all([
    listPrivateMessagesForAccount(accountNickname, 5000),
    listPrivateBlocks(accountNickname),
  ]);
  const conversationMap = new Map();

  for (const message of messages) {
    const counterpart =
      message.sender === accountNickname ? message.recipient : message.sender;
    let conversation = conversationMap.get(counterpart);

    if (!conversation) {
      conversation = {
        accountNickname: counterpart,
        lastText: message.text,
        lastAt: message.createdAt,
        unread: 0,
      };
      conversationMap.set(counterpart, conversation);
    }

    if (message.recipient === accountNickname && !message.readAt) {
      conversation.unread += 1;
    }
  }

  for (const block of blocks) {
    if (conversationMap.has(block.blocked)) continue;
    conversationMap.set(block.blocked, {
      accountNickname: block.blocked,
      lastText: "Utilisateur bloque",
      lastAt: block.createdAt,
      unread: 0,
    });
  }

  const conversations = (
    await Promise.all(
      [...conversationMap.values()].map(async (conversation) => {
        const account = await getAccountByNickname(conversation.accountNickname);
        if (!account) return null;

        return {
          ...conversation,
          nickname: account.displayName,
          role: account.role,
          avatarUrl: account.avatarUrl
            ? `/avatar/${encodeURIComponent(account.nickname)}`
            : "",
        };
      })
    )
  ).filter(Boolean);

  conversations.sort((a, b) => Number(b.lastAt) - Number(a.lastAt));
  return {
    conversations,
    totalUnread: conversations.reduce((total, conversation) => total + conversation.unread, 0),
  };
}

async function sendPrivateState(socket, accountNickname) {
  socket.emit("private-state", await buildPrivateState(accountNickname));
}

async function refreshPrivateStateForAccount(accountNickname) {
  const state = await buildPrivateState(accountNickname);
  emitToAccount(accountNickname, "private-state", state);
}

function emitToAccount(accountNickname, event, payload) {
  for (const [socketId, connectedUser] of users.entries()) {
    if (connectedUser.accountNickname === accountNickname) {
      io.to(socketId).emit(event, payload);
    }
  }
}

function emitPrivateError(socket, text) {
  socket.emit("private-error", { text });
}

async function sendAccountList(socket) {
  const accounts = await listAccounts();
  socket.emit("accounts", accounts);
}

async function handleAccountAction(socket, admin, action, rawNickname, rawRole, rawPassword) {
  if (action === "list") {
    await sendAccountList(socket);
    return;
  }

  const logActor = { nickname: admin.nickname, role: admin.role };
  const nickname = normalizeName(rawNickname);
  if (!nickname) {
    emitPrivateSystem(socket, "Indique un compte valide.");
    return;
  }

  const account = await getAccountByNickname(nickname);
  if (!account) {
    emitPrivateSystem(socket, "Compte introuvable.");
    return;
  }

  if (action === "role") {
    const role = ["user", "moderator", "admin"].includes(rawRole) ? rawRole : "user";
    await updateAccountRole(nickname, role);
    updateConnectedAccount(nickname, { role });
    io.emit("rooms", getRoomList());
    for (const room of rooms.keys()) publishUsers(room);
    emitPrivateSystem(socket, `Role de ${account.displayName} mis a jour : ${role}.`);
    await recordModerationAction(
      logActor,
      "account_role",
      account.displayName,
      `Role modifie de ${account.role} vers ${role}`
    );
    await sendAccountList(socket);
    return;
  }

  if (action === "active") {
    const active = Boolean(rawRole);

    if (admin.accountNickname === nickname && !active) {
      emitPrivateSystem(socket, "Tu ne peux pas desactiver ton propre compte.");
      return;
    }

    await setAccountActive(nickname, active);
    if (!active) disconnectAccount(nickname, "Ton compte a ete desactive.");
    emitPrivateSystem(socket, `${account.displayName} est maintenant ${active ? "actif" : "desactive"}.`);
    await recordModerationAction(
      logActor,
      active ? "account_enabled" : "account_disabled",
      account.displayName,
      active ? "Compte reactive" : "Compte desactive"
    );
    await sendAccountList(socket);
    return;
  }

  if (action === "password") {
    const password = String(rawPassword || "");
    if (password.length < 6) {
      emitPrivateSystem(socket, "Le nouveau mot de passe doit faire au moins 6 caracteres.");
      return;
    }

    await updateAccountPassword(nickname, await hashPassword(password));
    emitPrivateSystem(socket, `Mot de passe de ${account.displayName} reinitialise.`);
    await recordModerationAction(
      logActor,
      "password_reset",
      account.displayName,
      "Mot de passe reinitialise"
    );
    await sendAccountList(socket);
  }
}

function updateConnectedAccount(accountNickname, changes) {
  for (const user of users.values()) {
    if (user.accountNickname !== accountNickname) continue;
    Object.assign(user, changes);
  }
}

function disconnectAccount(accountNickname, reason) {
  for (const [socketId, user] of users.entries()) {
    if (user.accountNickname !== accountNickname) continue;
    io.to(socketId).emit("moderated", { reason });
    io.sockets.sockets.get(socketId)?.disconnect(true);
  }
}

async function handleRoomAction(socket, admin, action, rawName, rawTopic) {
  const name = cleanRoomName(rawName);
  const topic = cleanTopic(rawTopic);

  if (!name) {
    emitPrivateSystem(socket, "Indique un nom de salon valide.");
    return;
  }

  if (action === "create") {
    if (rooms.has(name)) {
      emitPrivateSystem(socket, `Le salon #${name} existe deja.`);
      return;
    }

    await createRoom(name, topic);
    rooms.set(name, {
      topic,
      history: [],
    });
    io.emit("rooms", getRoomList());
    await sendSystem(admin.room, `${admin.nickname} a cree le salon #${name}.`);
    await recordModerationAction(admin, "room_created", `#${name}`, `Sujet : ${topic}`);
    return;
  }

  if (!rooms.has(name)) {
    emitPrivateSystem(socket, `Le salon #${name} n'existe pas.`);
    return;
  }

  if (action === "topic") {
    await updateRoomTopic(name, topic);
    rooms.get(name).topic = topic;
    io.emit("rooms", getRoomList());
    io.to(name).emit("room-updated", {
      room: name,
      topic,
    });
    await sendSystem(name, `Sujet du salon mis a jour : ${topic}`);
    await recordModerationAction(admin, "room_topic", `#${name}`, `Nouveau sujet : ${topic}`);
    return;
  }

  if (action === "delete") {
    if (name === "accueil") {
      emitPrivateSystem(socket, "Le salon #accueil ne peut pas etre supprime.");
      return;
    }

    await deleteRoom(name);
    rooms.delete(name);

    for (const [socketId, user] of users.entries()) {
      if (user.room !== name) continue;

      const targetSocket = io.sockets.sockets.get(socketId);
      targetSocket?.leave(name);
      user.room = "accueil";
      targetSocket?.join("accueil");
      targetSocket?.emit("history", rooms.get("accueil").history);
      targetSocket?.emit("room-updated", {
        room: "accueil",
        topic: rooms.get("accueil").topic,
      });
      await sendSystem("accueil", `${user.nickname} a ete deplace vers #accueil.`);
    }

    io.emit("rooms", getRoomList());
    publishUsers("accueil");
    await sendSystem("accueil", `${admin.nickname} a supprime le salon #${name}.`);
    await recordModerationAction(admin, "room_deleted", `#${name}`, "Salon supprime");
  }
}

async function sendModerationLogs(socket) {
  socket.emit("moderation-logs", await listModerationLogs(100));
}

async function recordModerationAction(actor, action, target, details) {
  await saveModerationLog({
    id: crypto.randomUUID(),
    actor: actor.nickname,
    actorRole: actor.role,
    action,
    target,
    details,
    createdAt: Date.now(),
  });

  const logs = await listModerationLogs(100);
  for (const [socketId, user] of users.entries()) {
    if (user.role === "admin") io.to(socketId).emit("moderation-logs", logs);
  }
}

function emitPrivateSystem(socket, text) {
  socket.emit("message", {
    id: crypto.randomUUID(),
    type: "system",
    nickname: "Systeme",
    text,
    createdAt: Date.now(),
  });
}

function checkSpam(user, messageText) {
  if (MODERATION_ROLES.has(user.role)) {
    return { ok: true };
  }

  const now = Date.now();

  if (user.cooldownUntil > now) {
    const seconds = Math.ceil((user.cooldownUntil - now) / 1000);
    return {
      ok: false,
      message: `Anti-spam : attends encore ${seconds}s avant de reparler.`,
    };
  }

  const normalizedMessage = messageText.toLocaleLowerCase("fr-FR");
  if (normalizedMessage === user.lastMessage) {
    user.cooldownUntil = now + DUPLICATE_COOLDOWN_MS;
    return {
      ok: false,
      message: "Anti-spam : evite d'envoyer deux fois le meme message.",
    };
  }

  user.messageTimes = user.messageTimes.filter((sentAt) => now - sentAt < SPAM_WINDOW_MS);

  if (user.messageTimes.length >= SPAM_MAX_MESSAGES) {
    user.cooldownUntil = now + SPAM_COOLDOWN_MS;
    user.messageTimes = [];
    return {
      ok: false,
      message: "Anti-spam : trop de messages d'un coup, pause de 15s.",
    };
  }

  user.messageTimes.push(now);
  user.lastMessage = normalizedMessage;

  return { ok: true };
}

async function handleModeration(socket, admin, action, rawTarget) {
  if (!MODERATION_ROLES.has(admin.role)) {
    socket.emit("message", {
      id: crypto.randomUUID(),
      type: "system",
      nickname: "Systeme",
      text: "Commande reservee aux moderateurs et admins.",
      createdAt: Date.now(),
    });
    return;
  }

  const targetName = cleanName(rawTarget);
  const normalizedTarget = normalizeName(targetName);

  if (!normalizedTarget) {
    socket.emit("message", {
      id: crypto.randomUUID(),
      type: "system",
      nickname: "Systeme",
      text: "Indique un pseudo apres la commande.",
      createdAt: Date.now(),
    });
    return;
  }

  if (action === "unban") {
    await unbanNickname(normalizedTarget);
    await sendSystem(admin.room, `${targetName} n'est plus banni.`);
    await recordModerationAction(admin, "unban", targetName, "Bannissement retire");
    return;
  }

  const targetEntry = findUserByNickname(targetName);
  if (!targetEntry) {
    socket.emit("message", {
      id: crypto.randomUUID(),
      type: "system",
      nickname: "Systeme",
      text: `${targetName} n'est pas connecte.`,
      createdAt: Date.now(),
    });
    return;
  }

  const [targetSocketId, targetUser] = targetEntry;

  if (targetUser.role === "admin" || targetUser.role === "moderator") {
    socket.emit("message", {
      id: crypto.randomUUID(),
      type: "system",
      nickname: "Systeme",
      text: "Un moderateur/admin ne peut pas exclure un autre membre de l'equipe.",
      createdAt: Date.now(),
    });
    return;
  }

  if (action === "ban") {
    await banNickname(normalizeName(targetUser.nickname), targetUser.nickname, admin.nickname);
    await sendSystem(targetUser.room, `${targetUser.nickname} a ete banni par ${admin.nickname}.`);
    await recordModerationAction(admin, "ban", targetUser.nickname, `Salon #${targetUser.room}`);
  } else {
    await sendSystem(targetUser.room, `${targetUser.nickname} a ete exclu par ${admin.nickname}.`);
    await recordModerationAction(admin, "kick", targetUser.nickname, `Salon #${targetUser.room}`);
  }

  io.to(targetSocketId).emit("moderated", {
    reason: action === "ban" ? "Tu as ete banni du chat." : "Tu as ete exclu du salon.",
  });
  io.sockets.sockets.get(targetSocketId)?.disconnect(true);
}

async function addMessage(room, message) {
  const currentRoom = rooms.get(room);
  currentRoom.history.push(message);
  currentRoom.history = currentRoom.history.slice(-MAX_HISTORY);
  await saveMessage(room, message);
  await trimRoomHistory(room);
  io.to(room).emit("message", message);
}

async function sendSystem(room, text) {
  await addMessage(room, {
    id: crypto.randomUUID(),
    type: "system",
    nickname: "Systeme",
    text,
    createdAt: Date.now(),
  });
}

function publishUsers(room) {
  const connected = [...users.values()]
    .filter((user) => user.room === room)
    .map((user) => ({
      nickname: user.nickname,
      role: user.role,
      account: user.account,
      avatarUrl:
        user.avatarUrl && user.accountNickname
          ? `/avatar/${encodeURIComponent(user.accountNickname)}`
          : "",
    }))
    .sort((a, b) => a.nickname.localeCompare(b.nickname));

  io.to(room).emit("users", connected);
  io.emit("rooms", getRoomList());
}

function formatRoleSuffix(role) {
  if (role === "admin") return " (admin)";
  if (role === "moderator") return " (modo)";
  return "";
}

function getRoomList() {
  return [...rooms.entries()].map(([name, room]) => ({
    name,
    topic: room.topic,
    users: [...users.values()].filter((user) => user.room === name).length,
  }));
}

httpServer.listen(PORT, () => {
  console.log(`Chat disponible sur http://localhost:${PORT} (${getDatabaseLabel()})`);
});
