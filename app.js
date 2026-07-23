const socket = io();

const loginPanel = document.querySelector("#loginPanel");
const chatPanel = document.querySelector("#chatPanel");
const loginForm = document.querySelector("#loginForm");
const messageForm = document.querySelector("#messageForm");
const messageInput = document.querySelector("#messageInput");
const messages = document.querySelector("#messages");
const roomList = document.querySelector("#roomList");
const userList = document.querySelector("#userList");
const roomName = document.querySelector("#roomName");
const roomTopic = document.querySelector("#roomTopic");
const leaveButton = document.querySelector("#leaveButton");

let currentRoom = "accueil";
let currentNickname = "";

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
    },
    (response) => {
      if (!response.ok) {
        alert(response.error || "Impossible d'entrer dans le chat.");
        return;
      }

      currentRoom = response.room;
      currentNickname = response.nickname;
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
  userList.innerHTML = "";
  users.forEach((user) => {
    const item = document.createElement("li");
    item.textContent = user.role === "admin" ? `${user.nickname} admin` : user.nickname;
    item.className = user.nickname === currentNickname ? "is-me" : "";
    userList.append(item);
  });
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
  messageInput.focus();
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
