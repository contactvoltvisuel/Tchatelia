const socket = io();

const loginPanel = document.querySelector("#loginPanel");
const chatPanel = document.querySelector("#chatPanel");
const loginForm = document.querySelector("#loginForm");
const messageForm = document.querySelector("#messageForm");
const messageInput = document.querySelector("#messageInput");
const messages = document.querySelector("#messages");
const roomList = document.querySelector("#roomList");
const userList = document.querySelector("#userList");
const adminPanel = document.querySelector("#adminPanel");
const adminUserList = document.querySelector("#adminUserList");
const adminUnbanForm = document.querySelector("#adminUnbanForm");
const adminUnbanInput = document.querySelector("#adminUnbanInput");
const adminRoomCreateForm = document.querySelector("#adminRoomCreateForm");
const adminRoomNameInput = document.querySelector("#adminRoomNameInput");
const adminRoomTopicInput = document.querySelector("#adminRoomTopicInput");
const adminRoomTopicForm = document.querySelector("#adminRoomTopicForm");
const adminCurrentTopicInput = document.querySelector("#adminCurrentTopicInput");
const adminDeleteRoomButton = document.querySelector("#adminDeleteRoomButton");
const roomName = document.querySelector("#roomName");
const roomTopic = document.querySelector("#roomTopic");
const leaveButton = document.querySelector("#leaveButton");

let currentRoom = "accueil";
let currentNickname = "";
let currentRole = "user";
let currentUsers = [];

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(loginForm);
  currentNickname = data.get("nickname");

  socket.emit(
    "join",
    {
      nickname: currentNickname,
      room: data.get("room"),
      adminPassword: data.get("adminPassword"),
      accountPassword: data.get("accountPassword"),
      authMode: data.get("authMode"),
    },
    (response) => {
      if (!response.ok) {
        alert(response.error || "Impossible d'entrer dans le chat.");
        return;
      }

      currentRoom = response.room;
      currentNickname = response.nickname;
      currentRole = response.role;
      showChat(response);
    }
  );
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  socket.emit("message", messageInput.value);
  messageInput.value = "";
  messageInput.focus();
});

leaveButton.addEventListener("click", () => {
  window.location.reload();
});

adminUnbanForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const nickname = adminUnbanInput.value.trim();
  if (!nickname) return;

  socket.emit("admin-action", {
    action: "unban",
    nickname,
  });
  adminUnbanInput.value = "";
});

adminRoomCreateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = adminRoomNameInput.value.trim();
  const topic = adminRoomTopicInput.value.trim();
  if (!name) return;

  socket.emit("room-action", {
    action: "create",
    name,
    topic,
  });
  adminRoomNameInput.value = "";
  adminRoomTopicInput.value = "";
});

adminRoomTopicForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const topic = adminCurrentTopicInput.value.trim();
  if (!topic) return;

  socket.emit("room-action", {
    action: "topic",
    name: currentRoom,
    topic,
  });
  adminCurrentTopicInput.value = "";
});

adminDeleteRoomButton.addEventListener("click", () => {
  if (currentRoom === "accueil") {
    alert("Le salon #accueil ne peut pas etre supprime.");
    return;
  }

  if (!confirm(`Supprimer le salon #${currentRoom} ?`)) return;

  socket.emit("room-action", {
    action: "delete",
    name: currentRoom,
  });
});

socket.on("history", (history) => {
  messages.innerHTML = "";
  history.forEach(renderMessage);
  scrollToLatest();
});

socket.on("message", (message) => {
  renderMessage(message);
  scrollToLatest();
});

socket.on("users", (users) => {
  currentUsers = users;
  const me = users.find((user) => user.nickname === currentNickname);
  if (me) currentRole = me.role;

  userList.innerHTML = "";
  users.forEach((user) => {
    const item = document.createElement("li");
    item.textContent = user.role === "admin" ? `${user.nickname} admin` : user.nickname;
    item.className = user.nickname === currentNickname ? "is-me" : "";
    userList.append(item);
  });

  renderAdminPanel();
});

socket.on("moderated", ({ reason }) => {
  alert(reason);
  window.location.reload();
});

socket.on("rooms", (rooms) => {
  roomList.innerHTML = "";
  rooms.forEach((room) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = room.name === currentRoom ? "room active" : "room";
    button.innerHTML = `<span>#${escapeHtml(room.name)}</span><small>${room.users}</small>`;
    button.title = room.topic;
    button.addEventListener("click", () => switchRoom(room.name));
    roomList.append(button);
  });
});

socket.on("room-updated", ({ room, topic }) => {
  currentRoom = room;
  roomName.textContent = `#${room}`;
  roomTopic.textContent = topic;
  renderAdminPanel();
});

function switchRoom(room) {
  socket.emit("switch-room", room, (response) => {
    currentRoom = response.room;
    roomName.textContent = `#${response.room}`;
    roomTopic.textContent = response.topic;
  });
}

function showChat(response) {
  loginPanel.classList.add("hidden");
  chatPanel.classList.remove("hidden");
  roomName.textContent = `#${response.room}`;
  roomTopic.textContent = response.topic;
  renderAdminPanel();
  messageInput.focus();
}

function renderAdminPanel() {
  if (currentRole !== "admin") {
    adminPanel.classList.add("hidden");
    adminUserList.innerHTML = "";
    return;
  }

  adminPanel.classList.remove("hidden");
  adminUserList.innerHTML = "";
  adminDeleteRoomButton.disabled = currentRoom === "accueil";

  currentUsers.forEach((user) => {
    const row = document.createElement("div");
    row.className = "admin-user";

    const name = document.createElement("span");
    name.textContent = user.role === "admin" ? `${user.nickname} admin` : user.nickname;
    row.append(name);

    const actions = document.createElement("div");
    actions.className = "admin-actions";

    if (user.nickname !== currentNickname && user.role !== "admin") {
      actions.append(createAdminButton("Kick", "kick", user.nickname));
      actions.append(createAdminButton("Ban", "ban", user.nickname));
    }

    row.append(actions);
    adminUserList.append(row);
  });
}

function createAdminButton(label, action, nickname) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", () => {
    socket.emit("admin-action", {
      action,
      nickname,
    });
  });
  return button;
}

function renderMessage(message) {
  const row = document.createElement("article");
  row.className = `message ${message.type}`;

  if (message.type === "system") {
    row.textContent = message.text;
    messages.append(row);
    return;
  }

  const time = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(message.createdAt);

  row.innerHTML = `
    <div class="message-meta">
      <strong>${escapeHtml(message.nickname)}</strong>
      <time>${time}</time>
    </div>
    <p>${escapeHtml(message.text)}</p>
  `;

  messages.append(row);
}

function scrollToLatest() {
  messages.scrollTop = messages.scrollHeight;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
