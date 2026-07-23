import "./config.js";
import express from "express";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import {
  banNickname,
  getDatabaseLabel,
  getRoomHistory,
  getRooms,
  initDatabase,
  isBanned,
  saveMessage,
  trimRoomHistory,
  unbanNickname,
} from "./db.js";

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

io.on("connection", (socket) => {
  socket.on("join", async ({ nickname, room, adminPassword }, callback) => {
    const cleanNickname = cleanName(nickname);
    const cleanRoom = rooms.has(room) ? room : "accueil";
    const wantsAdmin = Boolean(String(adminPassword || "").trim());
    const isAdmin = String(adminPassword || "") === ADMIN_PASSWORD;

    if (wantsAdmin && !isAdmin) {
      callback?.({
        ok: false,
        error: "Mot de passe admin incorrect.",
      });
      return;
    }

    if (await isBanned(normalizeName(cleanNickname))) {
      callback?.({
        ok: false,
        error: "Ce pseudo est banni du chat.",
      });
      return;
    }

    users.set(socket.id, {
      nickname: cleanNickname,
      room: cleanRoom,
      role: isAdmin ? "admin" : "user",
      joinedAt: Date.now(),
    });

    socket.join(cleanRoom);
    socket.emit("rooms", getRoomList());
    socket.emit("history", rooms.get(cleanRoom).history);
    await sendSystem(
      cleanRoom,
      `${cleanNickname}${isAdmin ? " (admin)" : ""} vient d'entrer dans le salon.`
    );
    publishUsers(cleanRoom);

    callback?.({
      ok: true,
      nickname: cleanNickname,
      room: cleanRoom,
      role: isAdmin ? "admin" : "user",
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

function findUserByNickname(nickname) {
  const normalized = normalizeName(nickname);
  return [...users.entries()].find(([, user]) => normalizeName(user.nickname) === normalized);
}

async function handleModeration(socket, admin, action, rawTarget) {
  if (admin.role !== "admin") {
    socket.emit("message", {
      id: crypto.randomUUID(),
      type: "system",
      nickname: "Systeme",
      text: "Commande reservee aux admins.",
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

  if (targetUser.role === "admin") {
    socket.emit("message", {
      id: crypto.randomUUID(),
      type: "system",
      nickname: "Systeme",
      text: "Un admin ne peut pas exclure un autre admin dans cette version.",
      createdAt: Date.now(),
    });
    return;
  }

  if (action === "ban") {
    await banNickname(normalizeName(targetUser.nickname), targetUser.nickname, admin.nickname);
    await sendSystem(targetUser.room, `${targetUser.nickname} a ete banni par ${admin.nickname}.`);
  } else {
    await sendSystem(targetUser.room, `${targetUser.nickname} a ete exclu par ${admin.nickname}.`);
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
    }))
    .sort((a, b) => a.nickname.localeCompare(b.nickname));

  io.to(room).emit("users", connected);
  io.emit("rooms", getRoomList());
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
