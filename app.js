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
const adminRefreshAccountsButton = document.querySelector("#adminRefreshAccountsButton");
const adminAccountPanel = document.querySelector(".admin-account-panel");
const adminAccountList = document.querySelector("#adminAccountList");
const roomName = document.querySelector("#roomName");
const roomTopic = document.querySelector("#roomTopic");
const leaveButton = document.querySelector("#leaveButton");

let currentRoom = "accueil";
let currentNickname = "";
let currentRole = "user";
let currentUsers = [];
let currentAccounts = [];

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

adminRefreshAccountsButton.addEventListener("click", () => {
  socket.emit("account-action", {
    action: "list",
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
    item.textContent = formatUserName(user);
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

socket.on("accounts", (accounts) => {
  currentAccounts = accounts;
  renderAccountPanel();
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
  const canModerate = currentRole === "admin" || currentRole === "moderator";
  const canManage = currentRole === "admin";

  if (!canModerate) {
    adminPanel.classList.add("hidden");
    adminUserList.innerHTML = "";
    adminAccountList.innerHTML = "";
    return;
  }

  adminPanel.classList.remove("hidden");
  adminUserList.innerHTML = "";
  adminRoomCreateForm.classList.toggle("hidden", !canManage);
  adminRoomTopicForm.classList.toggle("hidden", !canManage);
  adminDeleteRoomButton.classList.toggle("hidden", !canManage);
  adminAccountPanel.classList.toggle("hidden", !canManage);
  adminDeleteRoomButton.disabled = currentRoom === "accueil";

  if (canManage) {
    socket.emit("account-action", {
      action: "list",
    });
  } else {
    adminAccountList.innerHTML = "";
  }

  currentUsers.forEach((user) => {
    const row = document.createElement("div");
    row.className = "admin-user";

    const name = document.createElement("span");
    name.textContent = formatUserName(user);
    row.append(name);

    const actions = document.createElement("div");
    actions.className = "admin-actions";

    if (user.nickname !== currentNickname && user.role !== "admin" && user.role !== "moderator") {
      actions.append(createAdminButton("Kick", "kick", user.nickname));
      actions.append(createAdminButton("Ban", "ban", user.nickname));
    }

    row.append(actions);
    adminUserList.append(row);
  });

  renderAccountPanel();
}

function renderAccountPanel() {
  if (currentRole !== "admin") return;

  adminAccountList.innerHTML = "";

  if (!currentAccounts.length) {
    const empty = document.createElement("p");
    empty.className = "admin-empty";
    empty.textContent = "Aucun compte inscrit.";
    adminAccountList.append(empty);
    return;
  }

  currentAccounts.forEach((account) => {
    const row = document.createElement("div");
    row.className = account.active ? "admin-account" : "admin-account is-disabled";

    const title = document.createElement("div");
    title.className = "admin-account-title";
    title.innerHTML = `<strong>${escapeHtml(account.displayName)}</strong><small>${account.role}${account.active ? "" : " desactive"}</small>`;
    row.append(title);

    const roleSelect = document.createElement("select");
    roleSelect.innerHTML = `
      <option value="user">Utilisateur</option>
      <option value="moderator">Moderateur</option>
      <option value="admin">Admin</option>
    `;
    roleSelect.value = account.role;
    roleSelect.addEventListener("change", () => {
      socket.emit("account-action", {
        action: "role",
        nickname: account.nickname,
        role: roleSelect.value,
      });
    });
    row.append(roleSelect);

    const actions = document.createElement("div");
    actions.className = "admin-account-actions";

    const activeButton = document.createElement("button");
    activeButton.type = "button";
    activeButton.textContent = account.active ? "Desactiver" : "Reactiver";
    activeButton.className = account.active ? "danger-button" : "";
    activeButton.addEventListener("click", () => {
      socket.emit("account-action", {
        action: "active",
        nickname: account.nickname,
        role: !account.active,
      });
    });
    actions.append(activeButton);

    const passwordButton = document.createElement("button");
    passwordButton.type = "button";
    passwordButton.textContent = "Nouveau mdp";
    passwordButton.addEventListener("click", () => {
      const password = prompt(`Nouveau mot de passe pour ${account.displayName}`);
      if (!password) return;

      socket.emit("account-action", {
        action: "password",
        nickname: account.nickname,
        password,
      });
    });
    actions.append(passwordButton);

    row.append(actions);
    adminAccountList.append(row);
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

function formatUserName(user) {
  if (user.role === "admin") return `${user.nickname} admin`;
  if (user.role === "moderator") return `${user.nickname} modo`;
  return user.nickname;
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
