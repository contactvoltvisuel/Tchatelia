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
const adminModerationLogPanel = document.querySelector(".admin-moderation-log-panel");
const adminRefreshLogsButton = document.querySelector("#adminRefreshLogsButton");
const adminModerationLogList = document.querySelector("#adminModerationLogList");
const roomName = document.querySelector("#roomName");
const roomTopic = document.querySelector("#roomTopic");
const myProfileButton = document.querySelector("#myProfileButton");
const leaveButton = document.querySelector("#leaveButton");
const profileDialog = document.querySelector("#profileDialog");
const profileCloseButton = document.querySelector("#profileCloseButton");
const profileAvatarImage = document.querySelector("#profileAvatarImage");
const profileAvatarFallback = document.querySelector("#profileAvatarFallback");
const profileRole = document.querySelector("#profileRole");
const profileNickname = document.querySelector("#profileNickname");
const profileMemberSince = document.querySelector("#profileMemberSince");
const profileBio = document.querySelector("#profileBio");
const profileForm = document.querySelector("#profileForm");
const profileAvatarInput = document.querySelector("#profileAvatarInput");
const profileBioInput = document.querySelector("#profileBioInput");

let currentRoom = "accueil";
let currentNickname = "";
let currentRole = "user";
let currentAccount = false;
let currentUsers = [];
let currentAccounts = [];
let currentModerationLogs = [];

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
      currentAccount = response.account;
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

myProfileButton.addEventListener("click", () => {
  requestProfile(currentNickname);
});

profileCloseButton.addEventListener("click", () => {
  profileDialog.close();
});

profileDialog.addEventListener("click", (event) => {
  if (event.target === profileDialog) profileDialog.close();
});

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  socket.emit("profile-action", {
    action: "update",
    bio: profileBioInput.value,
    avatarUrl: profileAvatarInput.value,
  });
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

adminRefreshLogsButton.addEventListener("click", () => {
  socket.emit("moderation-log-action", {
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
    item.className = user.nickname === currentNickname ? "is-me" : "";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "profile-user-button";
    button.title = `Voir le profil de ${user.nickname}`;
    button.append(createAvatar(user, "small"));

    const name = document.createElement("span");
    name.textContent = formatUserName(user);
    button.append(name);
    button.addEventListener("click", () => requestProfile(user.nickname));

    item.append(button);
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

socket.on("moderation-logs", (logs) => {
  currentModerationLogs = logs;
  renderModerationLog();
});

socket.on("profile", (profile) => {
  renderProfile(profile);
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
  myProfileButton.classList.toggle("hidden", !currentAccount);
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
    adminModerationLogList.innerHTML = "";
    return;
  }

  adminPanel.classList.remove("hidden");
  adminUserList.innerHTML = "";
  adminRoomCreateForm.classList.toggle("hidden", !canManage);
  adminRoomTopicForm.classList.toggle("hidden", !canManage);
  adminDeleteRoomButton.classList.toggle("hidden", !canManage);
  adminAccountPanel.classList.toggle("hidden", !canManage);
  adminModerationLogPanel.classList.toggle("hidden", !canManage);
  adminDeleteRoomButton.disabled = currentRoom === "accueil";

  if (canManage) {
    socket.emit("account-action", {
      action: "list",
    });
    socket.emit("moderation-log-action", {
      action: "list",
    });
  } else {
    adminAccountList.innerHTML = "";
    adminModerationLogList.innerHTML = "";
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
  renderModerationLog();
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

function renderModerationLog() {
  if (currentRole !== "admin") return;

  adminModerationLogList.innerHTML = "";

  if (!currentModerationLogs.length) {
    const empty = document.createElement("p");
    empty.className = "admin-empty";
    empty.textContent = "Aucune action enregistree.";
    adminModerationLogList.append(empty);
    return;
  }

  currentModerationLogs.forEach((log) => {
    const row = document.createElement("article");
    row.className = "admin-moderation-log";

    const title = document.createElement("strong");
    title.textContent = `${formatLogAction(log.action)} : ${log.target}`;

    const details = document.createElement("span");
    details.textContent = log.details;

    const meta = document.createElement("small");
    const date = new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(Number(log.createdAt));
    meta.textContent = `${date} - ${log.actor} (${formatRole(log.actorRole)})`;

    row.append(title, details, meta);
    adminModerationLogList.append(row);
  });
}

function formatLogAction(action) {
  const labels = {
    kick: "Exclusion",
    ban: "Bannissement",
    unban: "Debannissement",
    account_role: "Role modifie",
    account_enabled: "Compte reactive",
    account_disabled: "Compte desactive",
    password_reset: "Mot de passe",
    room_created: "Salon cree",
    room_topic: "Sujet modifie",
    room_deleted: "Salon supprime",
  };
  return labels[action] || action;
}

function formatRole(role) {
  if (role === "admin") return "admin";
  if (role === "moderator") return "moderateur";
  return "utilisateur";
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

function requestProfile(nickname) {
  socket.emit("profile-action", {
    action: "get",
    nickname,
  });
}

function renderProfile(profile) {
  profileNickname.textContent = profile.nickname;
  profileRole.textContent = profile.account ? formatRole(profile.role) : "invite";
  profileBio.textContent = profile.bio || "Aucune description.";
  profileMemberSince.textContent = profile.account
    ? `Membre depuis le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
        Number(profile.createdAt)
      )}`
    : "Profil invite";

  setAvatar(profileAvatarImage, profileAvatarFallback, profile.avatarUrl, profile.nickname);

  profileForm.classList.toggle("hidden", !profile.isOwn);
  if (profile.isOwn) {
    profileAvatarInput.value = profile.avatarUrl || "";
    profileBioInput.value = profile.bio || "";
  }

  if (!profileDialog.open) profileDialog.showModal();
}

function createAvatar(user, size) {
  const avatar = document.createElement("span");
  avatar.className = `user-avatar ${size}`;

  const fallback = document.createElement("span");
  fallback.textContent = getInitials(user.nickname);
  avatar.append(fallback);

  if (user.avatarUrl) {
    const image = document.createElement("img");
    image.alt = "";
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("error", () => image.remove());
    image.src = user.avatarUrl;
    avatar.append(image);
  }

  return avatar;
}

function setAvatar(image, fallback, avatarUrl, nickname) {
  fallback.textContent = getInitials(nickname);
  image.hidden = !avatarUrl;
  image.src = avatarUrl || "";
  image.onerror = () => {
    image.hidden = true;
  };
  image.onload = () => {
    image.hidden = false;
  };
}

function getInitials(nickname) {
  return String(nickname || "?").slice(0, 2).toUpperCase();
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
