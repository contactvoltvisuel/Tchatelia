const THEME_STORAGE_KEY = "tchateliaTheme";
let currentTheme = getStoredTheme();
document.documentElement.dataset.theme = currentTheme;

const socket = io();

const loginPanel = document.querySelector("#loginPanel");
const chatPanel = document.querySelector("#chatPanel");
const loginForm = document.querySelector("#loginForm");
const nicknameInput = document.querySelector("#nickname");
const roomSelect = document.querySelector("#room");
const heroEnterButton = document.querySelector("#heroEnterButton");
const heroRegisterButton = document.querySelector("#heroRegisterButton");
const popularRoomButtons = document.querySelectorAll("[data-popular-room]");
const popularRoomCounts = document.querySelectorAll("[data-room-count]");
const accountPasswordInput = document.querySelector("#accountPassword");
const accountEmailField = document.querySelector("#accountEmailField");
const accountEmailInput = document.querySelector("#accountEmail");
const accountGenderField = document.querySelector("#accountGenderField");
const adminAccessField = document.querySelector("#adminAccessField");
const adminPasswordInput = document.querySelector("#adminPassword");
const forgotPasswordButton = document.querySelector("#forgotPasswordButton");
const authModeInputs = document.querySelectorAll('input[name="authMode"]');
const loginSecurity = document.querySelector("#loginSecurity");
const turnstileWidget = document.querySelector("#turnstileWidget");
const messageForm = document.querySelector("#messageForm");
const messageInput = document.querySelector("#messageInput");
const composerContext = document.querySelector("#composerContext");
const composerContextTitle = document.querySelector("#composerContextTitle");
const composerContextText = document.querySelector("#composerContextText");
const composerContextCancel = document.querySelector("#composerContextCancel");
const typingIndicator = document.querySelector("#typingIndicator");
const messages = document.querySelector("#messages");
const messageSearchToggleButton = document.querySelector("#messageSearchToggleButton");
const messageSearchForm = document.querySelector("#messageSearchForm");
const messageSearchInput = document.querySelector("#messageSearchInput");
const messageSearchCount = document.querySelector("#messageSearchCount");
const messageSearchPrevious = document.querySelector("#messageSearchPrevious");
const messageSearchNext = document.querySelector("#messageSearchNext");
const messageSearchClose = document.querySelector("#messageSearchClose");
const favoriteMessagesButton = document.querySelector("#favoriteMessagesButton");
const messageFavoritesFilter = document.querySelector("#messageFavoritesFilter");
const pinnedMessageBanner = document.querySelector("#pinnedMessageBanner");
const pinnedMessageJump = document.querySelector("#pinnedMessageJump");
const pinnedMessageAuthor = document.querySelector("#pinnedMessageAuthor");
const pinnedMessageText = document.querySelector("#pinnedMessageText");
const roomList = document.querySelector("#roomList");
const userList = document.querySelector("#userList");
const presenceSelect = document.querySelector("#presenceSelect");
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
const adminSecurityPanel = document.querySelector(".admin-security-panel");
const adminRefreshSecurityButton = document.querySelector("#adminRefreshSecurityButton");
const adminSecurityEventCount = document.querySelector("#adminSecurityEventCount");
const adminSecurityList = document.querySelector("#adminSecurityList");
const adminRefreshReportsButton = document.querySelector("#adminRefreshReportsButton");
const adminReportList = document.querySelector("#adminReportList");
const adminContactPanel = document.querySelector(".admin-contact-panel");
const adminRefreshContactsButton = document.querySelector("#adminRefreshContactsButton");
const adminContactList = document.querySelector("#adminContactList");
const roomName = document.querySelector("#roomName");
const roomTopic = document.querySelector("#roomTopic");
const privateMessagesButton = document.querySelector("#privateMessagesButton");
const privateUnreadBadge = document.querySelector("#privateUnreadBadge");
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
const profileAvatarFileInput = document.querySelector("#profileAvatarFileInput");
const profileAvatarInput = document.querySelector("#profileAvatarInput");
const profileRemoveAvatarButton = document.querySelector("#profileRemoveAvatarButton");
const profileBioInput = document.querySelector("#profileBioInput");
const profilePrivateButton = document.querySelector("#profilePrivateButton");
const profileBlockButton = document.querySelector("#profileBlockButton");
const profileReportButton = document.querySelector("#profileReportButton");
const privateDialog = document.querySelector("#privateDialog");
const privateCloseButton = document.querySelector("#privateCloseButton");
const privateConversationList = document.querySelector("#privateConversationList");
const privateEmpty = document.querySelector("#privateEmpty");
const privateActive = document.querySelector("#privateActive");
const privateAvatarImage = document.querySelector("#privateAvatarImage");
const privateAvatarFallback = document.querySelector("#privateAvatarFallback");
const privateNickname = document.querySelector("#privateNickname");
const privateStatus = document.querySelector("#privateStatus");
const privateBlockButton = document.querySelector("#privateBlockButton");
const privateMessages = document.querySelector("#privateMessages");
const privateMessageForm = document.querySelector("#privateMessageForm");
const privateMessageInput = document.querySelector("#privateMessageInput");
const reportDialog = document.querySelector("#reportDialog");
const reportCloseButton = document.querySelector("#reportCloseButton");
const reportTitle = document.querySelector("#reportTitle");
const reportContext = document.querySelector("#reportContext");
const reportForm = document.querySelector("#reportForm");
const reportReason = document.querySelector("#reportReason");
const reportDetails = document.querySelector("#reportDetails");
const roomSidebar = document.querySelector("#roomSidebar");
const memberSidebar = document.querySelector("#memberSidebar");
const roomSidebarButton = document.querySelector("#roomSidebarButton");
const roomSidebarCloseButton = document.querySelector("#roomSidebarCloseButton");
const membersPanelButton = document.querySelector("#membersPanelButton");
const membersPanelCloseButton = document.querySelector("#membersPanelCloseButton");
const mobileOverlay = document.querySelector("#mobileOverlay");
const memberCount = document.querySelector("#memberCount");
const currentUserName = document.querySelector("#currentUserName");
const currentUserRole = document.querySelector("#currentUserRole");
const currentUserInitials = document.querySelector("#currentUserInitials");
const sidebarProfileButton = document.querySelector("#sidebarProfileButton");
const accountSettingsButton = document.querySelector("#accountSettingsButton");
const themeToggleButton = document.querySelector("#themeToggleButton");
const themeToggleIcon = document.querySelector("#themeToggleIcon");
const themeToggleLabel = document.querySelector("#themeToggleLabel");
const sidebarCreateRoomButton = document.querySelector("#sidebarCreateRoomButton");
const adminPanelButton = document.querySelector("#adminPanelButton");
const adminDialog = document.querySelector("#adminDialog");
const adminCloseButton = document.querySelector("#adminCloseButton");
const notificationToggleButton = document.querySelector("#notificationToggleButton");
const notificationState = document.querySelector("#notificationState");
const notificationStack = document.querySelector("#notificationStack");
const settingsDialog = document.querySelector("#settingsDialog");
const settingsCloseButton = document.querySelector("#settingsCloseButton");
const settingsAccountNickname = document.querySelector("#settingsAccountNickname");
const settingsGeneralForm = document.querySelector("#settingsGeneralForm");
const settingsDisplayName = document.querySelector("#settingsDisplayName");
const settingsEmail = document.querySelector("#settingsEmail");
const settingsEmailVerificationState = document.querySelector(
  "#settingsEmailVerificationState"
);
const settingsResendVerificationButton = document.querySelector(
  "#settingsResendVerificationButton"
);
const settingsNotifications = document.querySelector("#settingsNotifications");
const settingsPrivateMessages = document.querySelector("#settingsPrivateMessages");
const settingsThemeInputs = document.querySelectorAll('input[name="settingsTheme"]');
const settingsGeneralStatus = document.querySelector("#settingsGeneralStatus");
const settingsPasswordForm = document.querySelector("#settingsPasswordForm");
const settingsCurrentPassword = document.querySelector("#settingsCurrentPassword");
const settingsNewPassword = document.querySelector("#settingsNewPassword");
const settingsConfirmPassword = document.querySelector("#settingsConfirmPassword");
const settingsPasswordStatus = document.querySelector("#settingsPasswordStatus");
const settingsLogoutAllButton = document.querySelector("#settingsLogoutAllButton");
const settingsSessionsStatus = document.querySelector("#settingsSessionsStatus");
const settingsBlockedCount = document.querySelector("#settingsBlockedCount");
const settingsBlockedList = document.querySelector("#settingsBlockedList");
const settingsDeleteForm = document.querySelector("#settingsDeleteForm");
const settingsDeletePassword = document.querySelector("#settingsDeletePassword");
const settingsDeleteConfirm = document.querySelector("#settingsDeleteConfirm");
const settingsDeleteStatus = document.querySelector("#settingsDeleteStatus");
const passwordResetDialog = document.querySelector("#passwordResetDialog");
const passwordResetCloseButton = document.querySelector("#passwordResetCloseButton");
const passwordResetTitle = document.querySelector("#passwordResetTitle");
const passwordResetRequestForm = document.querySelector("#passwordResetRequestForm");
const passwordResetEmail = document.querySelector("#passwordResetEmail");
const passwordResetConfirmForm = document.querySelector("#passwordResetConfirmForm");
const passwordResetNewPassword = document.querySelector("#passwordResetNewPassword");
const passwordResetConfirmPassword = document.querySelector("#passwordResetConfirmPassword");
const passwordResetStatus = document.querySelector("#passwordResetStatus");
const emailVerificationDialog = document.querySelector("#emailVerificationDialog");
const emailVerificationCloseButton = document.querySelector(
  "#emailVerificationCloseButton"
);
const emailVerificationTitle = document.querySelector("#emailVerificationTitle");
const emailVerificationMessage = document.querySelector("#emailVerificationMessage");
const emailVerificationAddress = document.querySelector("#emailVerificationAddress");
const emailVerificationResendButton = document.querySelector(
  "#emailVerificationResendButton"
);
const emailVerificationStatus = document.querySelector("#emailVerificationStatus");

let currentRoom = "accueil";
let currentNickname = "";
let currentRole = "user";
let currentGender = "other";
let currentAccount = false;
let currentAccountNickname = "";
let currentPresenceStatus = "online";
let currentUsers = [];
let currentAccounts = [];
let currentModerationLogs = [];
let currentSecurityEvents = [];
let currentReports = [];
let currentContactMessages = [];
let selectedAvatar = null;
let currentProfileAccountNickname = "";
let currentProfileNickname = "";
let currentProfileBlockedByMe = false;
let privateConversations = [];
let activePrivateAccount = "";
let activePrivateBlockedByMe = false;
let pendingReport = null;
let currentRooms = [];
let privateUnreadTotal = 0;
let audioContext = null;
let turnstileToken = "";
let turnstileWidgetId = null;
let activeMessageAction = null;
let typingActive = false;
let typingStopTimer = null;
let lastTypingSignalAt = 0;
let messageSearchResults = [];
let messageSearchIndex = -1;
let favoritesOnly = false;
let passwordResetEnabled = false;
let emailVerificationEnabled = false;
let minimumPasswordLength = 8;
let maximumPasswordLength = 128;
let adminAccessAllowed = true;
let activePasswordResetToken = "";
let activeVerificationEmail = "";
const currentRoomMessages = new Map();
const PRESENCE_LABELS = {
  online: "En ligne",
  away: "Absent",
  busy: "Occupe",
};
const GENDER_CLASS_NAMES = ["gender-man", "gender-woman", "gender-other"];
const ROLE_CLASS_NAMES = ["role-admin", "role-moderator"];
const REACTION_OPTIONS = [
  { key: "like", emoji: "\u{1F44D}", label: "J'aime" },
  { key: "heart", emoji: "\u{2764}\u{FE0F}", label: "J'adore" },
  { key: "laugh", emoji: "\u{1F602}", label: "Drole" },
  { key: "surprised", emoji: "\u{1F62E}", label: "Surpris" },
];
let alertsEnabled =
  typeof Notification !== "undefined" &&
  Notification.permission === "granted" &&
  localStorage.getItem("tchateliaAlerts") === "enabled";
const unreadByRoom = new Map();

updateAuthModeRequirements();
updateThemeControls();
openPasswordResetConfirmationFromUrl();
openEmailVerificationFromUrl();
initializeApplication();

authModeInputs.forEach((input) => {
  input.addEventListener("change", updateAuthModeRequirements);
});

heroEnterButton.addEventListener("click", () => {
  activateLoginMode("guest");
});

heroRegisterButton.addEventListener("click", () => {
  activateLoginMode("register");
});

popularRoomButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const room = String(button.dataset.popularRoom || "");
    if (room && [...roomSelect.options].some((option) => option.value === room)) {
      roomSelect.value = room;
    }
    activateLoginMode("guest");
  });
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(loginForm);
  const authMode = String(data.get("authMode") || "guest");
  const requestedRoom = String(data.get("room") || "accueil");
  const submitButton = loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    if (authMode === "login") {
      const sessionResponse = await createBrowserSession({
        nickname: data.get("nickname"),
        password: data.get("accountPassword"),
        turnstileToken,
      });
      if (!sessionResponse.ok) {
        handleJoinFailure(sessionResponse);
        return;
      }
      await reconnectSocketForSession();
      joinChat({
        nickname: sessionResponse.account.nickname,
        room: requestedRoom,
        adminPassword: "",
        accountPassword: "",
        accountEmail: "",
        accountGender: "",
        authMode: "session",
        legalAccepted: true,
        turnstileToken: "",
      });
      return;
    }

    joinChat({
      nickname: data.get("nickname"),
      room: requestedRoom,
      adminPassword: data.get("adminPassword"),
      accountPassword: data.get("accountPassword"),
      accountEmail: data.get("accountEmail"),
      accountGender: data.get("accountGender"),
      authMode,
      legalAccepted: data.get("legalAccepted") === "on",
      turnstileToken,
    });
  } catch {
    alert("La connexion n'a pas pu etre terminee. Reessaie.");
  } finally {
    submitButton.disabled = false;
  }
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  stopTyping();
  if (!text) return;

  if (activeMessageAction?.mode === "edit") {
    socket.emit(
      "message-action",
      {
        action: "edit",
        id: activeMessageAction.id,
        text,
      },
      (response) => {
        if (!response?.ok) {
          alert(response?.error || "Le message n'a pas pu etre modifie.");
          return;
        }
        messageInput.value = "";
        clearMessageAction();
      }
    );
    return;
  }

  socket.emit("message", {
    text,
    replyToId:
      activeMessageAction?.mode === "reply"
        ? activeMessageAction.id
        : "",
  });
  messageInput.value = "";
  clearMessageAction();
  messageInput.focus();
});

messageInput.addEventListener("input", updateTypingState);
messageInput.addEventListener("blur", stopTyping);

messageSearchToggleButton.addEventListener("click", () => {
  if (messageSearchForm.classList.contains("hidden")) {
    openMessageSearch();
  } else {
    closeMessageSearch();
  }
});

messageSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (messageSearchResults.length) goToSearchResult(1);
});

messageSearchInput.addEventListener("input", () => {
  runMessageSearch({ focusResult: false });
});

messageSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMessageSearch();
  }
});

messageSearchPrevious.addEventListener("click", () => {
  goToSearchResult(-1);
});

messageSearchNext.addEventListener("click", () => {
  goToSearchResult(1);
});

messageSearchClose.addEventListener("click", closeMessageSearch);

favoriteMessagesButton.addEventListener("click", () => {
  if (!currentAccount) return;
  favoritesOnly = true;
  openMessageSearch();
  updateFavoritesFilter();
  runMessageSearch({ focusResult: true });
});

messageFavoritesFilter.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  updateFavoritesFilter();
  runMessageSearch({ focusResult: true });
});

pinnedMessageJump.addEventListener("click", () => {
  const pinnedMessage = [...currentRoomMessages.values()].find(
    (message) => message.pinnedAt && !message.deletedAt
  );
  if (pinnedMessage) focusReferencedMessage(pinnedMessage.id);
});

forgotPasswordButton.addEventListener("click", () => {
  activePasswordResetToken = "";
  passwordResetTitle.textContent = "Recuperer mon mot de passe";
  passwordResetRequestForm.classList.remove("hidden");
  passwordResetConfirmForm.classList.add("hidden");
  passwordResetRequestForm.reset();
  setSettingsStatus(passwordResetStatus, "");
  if (!passwordResetDialog.open) passwordResetDialog.showModal();
  passwordResetEmail.focus();
});

passwordResetCloseButton.addEventListener("click", () => {
  passwordResetDialog.close();
});

passwordResetDialog.addEventListener("click", (event) => {
  if (event.target === passwordResetDialog) passwordResetDialog.close();
});

passwordResetRequestForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const submitButton = passwordResetRequestForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  setSettingsStatus(passwordResetStatus, "Envoi en cours...");
  socket.emit(
    "password-reset-request",
    { email: passwordResetEmail.value },
    (response) => {
      submitButton.disabled = false;
      setSettingsStatus(
        passwordResetStatus,
        response?.message || response?.error || "La demande n'a pas pu etre envoyee.",
        !response?.ok
      );
      if (response?.ok) passwordResetRequestForm.reset();
    }
  );
});

passwordResetConfirmForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (passwordResetNewPassword.value !== passwordResetConfirmPassword.value) {
    setSettingsStatus(passwordResetStatus, "Les deux mots de passe sont differents.", true);
    return;
  }

  const submitButton = passwordResetConfirmForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  setSettingsStatus(passwordResetStatus, "Modification...");
  socket.emit(
    "password-reset-confirm",
    {
      token: activePasswordResetToken,
      newPassword: passwordResetNewPassword.value,
    },
    (response) => {
      submitButton.disabled = false;
      setSettingsStatus(
        passwordResetStatus,
        response?.message || response?.error || "Le mot de passe n'a pas pu etre modifie.",
        !response?.ok
      );
      if (!response?.ok) return;
      passwordResetConfirmForm.reset();
      activePasswordResetToken = "";
      logoutCurrentSession({ reload: false });
      window.history.replaceState({}, document.title, window.location.pathname);
      window.setTimeout(() => passwordResetDialog.close(), 1400);
    }
  );
});

emailVerificationCloseButton.addEventListener("click", () => {
  emailVerificationDialog.close();
});

emailVerificationDialog.addEventListener("click", (event) => {
  if (event.target === emailVerificationDialog) emailVerificationDialog.close();
});

emailVerificationResendButton.addEventListener("click", () => {
  requestEmailVerification(activeVerificationEmail);
});

settingsResendVerificationButton.addEventListener("click", () => {
  openEmailVerificationDialog({
    email: settingsEmail.value,
    message: "Un nouveau lien va etre envoye a cette adresse.",
  });
  requestEmailVerification(settingsEmail.value);
});

presenceSelect.addEventListener("change", () => {
  const previousStatus = currentPresenceStatus;
  const status = presenceSelect.value;
  presenceSelect.disabled = true;
  socket.emit("presence-status", { status }, (response) => {
    presenceSelect.disabled = false;
    if (!response?.ok) {
      presenceSelect.value = previousStatus;
      alert(response?.error || "Le statut n'a pas pu etre modifie.");
      return;
    }
    currentPresenceStatus = response.status;
    presenceSelect.value = response.status;
    updateCurrentUserSummary();
  });
});

composerContextCancel.addEventListener("click", () => {
  clearMessageAction();
  messageInput.focus();
});

leaveButton.addEventListener("click", async () => {
  stopTyping();
  await logoutCurrentSession();
});

myProfileButton.addEventListener("click", () => {
  requestProfile(currentNickname);
});

privateMessagesButton.addEventListener("click", () => {
  openPrivateMessages();
});

notificationToggleButton.addEventListener("click", async () => {
  await setAlertsPreference(!alertsEnabled);
});

sidebarProfileButton.addEventListener("click", () => {
  requestProfile(currentNickname);
});

accountSettingsButton.addEventListener("click", openAccountSettings);

themeToggleButton.addEventListener("click", () => {
  setTheme(currentTheme === "dark" ? "light" : "dark");
});

settingsThemeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (input.checked) setTheme(input.value);
  });
});

roomSidebarButton.addEventListener("click", () => {
  openMobilePanel(roomSidebar);
});

roomSidebarCloseButton.addEventListener("click", closeMobilePanels);

membersPanelButton.addEventListener("click", () => {
  openMobilePanel(memberSidebar);
});

membersPanelCloseButton.addEventListener("click", closeMobilePanels);
mobileOverlay.addEventListener("click", closeMobilePanels);

adminPanelButton.addEventListener("click", () => {
  closeMobilePanels();
  if (!adminDialog.open) adminDialog.showModal();
});

sidebarCreateRoomButton.addEventListener("click", () => {
  if (currentRole !== "admin") return;
  closeMobilePanels();
  if (!adminDialog.open) adminDialog.showModal();
  window.setTimeout(() => adminRoomNameInput.focus(), 80);
});

adminCloseButton.addEventListener("click", () => {
  adminDialog.close();
});

adminDialog.addEventListener("click", (event) => {
  if (event.target === adminDialog) adminDialog.close();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopTyping();
  } else {
    markCurrentRoomRead();
  }
});

window.addEventListener("focus", markCurrentRoomRead);

profileCloseButton.addEventListener("click", () => {
  profileDialog.close();
});

profileDialog.addEventListener("click", (event) => {
  if (event.target === profileDialog) profileDialog.close();
});

settingsCloseButton.addEventListener("click", () => {
  settingsDialog.close();
});

settingsDialog.addEventListener("click", (event) => {
  if (event.target === settingsDialog) settingsDialog.close();
});

settingsGeneralForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setSettingsStatus(settingsGeneralStatus, "Enregistrement...");

  const notificationsEnabled = await setAlertsPreference(
    settingsNotifications.checked,
    false
  );
  settingsNotifications.checked = notificationsEnabled;

  socket.emit(
    "settings-action",
    {
      action: "update",
      displayName: settingsDisplayName.value,
      email: settingsEmail.value,
      privateMessagesEnabled: settingsPrivateMessages.checked,
    },
    (response) => {
      if (!response?.ok) {
        setSettingsStatus(
          settingsGeneralStatus,
          response?.error || "Impossible d'enregistrer les preferences.",
          true
        );
        return;
      }
      renderAccountSettings(response.settings);
      setSettingsStatus(
        settingsGeneralStatus,
        response.message || "Preferences enregistrees."
      );
    }
  );
});

settingsPasswordForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (settingsNewPassword.value !== settingsConfirmPassword.value) {
    setSettingsStatus(
      settingsPasswordStatus,
      "Les deux nouveaux mots de passe sont differents.",
      true
    );
    return;
  }

  setSettingsStatus(settingsPasswordStatus, "Modification...");
  socket.emit(
    "settings-action",
    {
      action: "password",
      currentPassword: settingsCurrentPassword.value,
      newPassword: settingsNewPassword.value,
    },
    (response) => {
      if (!response?.ok) {
        setSettingsStatus(
          settingsPasswordStatus,
          response?.error || "Impossible de modifier le mot de passe.",
          true
        );
        return;
      }
      settingsPasswordForm.reset();
      if (response.sessionRevoked) {
        alert(response.message || "Mot de passe modifie. Reconnecte-toi.");
        logoutCurrentSession();
        return;
      }
      setSettingsStatus(settingsPasswordStatus, response.message || "Mot de passe modifie.");
    }
  );
});

settingsLogoutAllButton.addEventListener("click", () => {
  if (!confirm("Deconnecter Tchatelia sur tous tes appareils ?")) return;
  settingsLogoutAllButton.disabled = true;
  setSettingsStatus(settingsSessionsStatus, "Deconnexion...");
  socket.emit("settings-action", { action: "logout-all" }, (response) => {
    settingsLogoutAllButton.disabled = false;
    if (!response?.ok) {
      setSettingsStatus(
        settingsSessionsStatus,
        response?.error || "Impossible de fermer les sessions.",
        true
      );
      return;
    }
    alert(response.message || "Toutes les sessions ont ete fermees.");
    logoutCurrentSession();
  });
});

settingsDeleteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!settingsDeleteConfirm.checked) return;
  if (!confirm("Supprimer definitivement ce compte et ses messages prives ?")) return;

  setSettingsStatus(settingsDeleteStatus, "Suppression...");
  socket.emit(
    "settings-action",
    {
      action: "delete",
      currentPassword: settingsDeletePassword.value,
    },
    (response) => {
      if (!response?.ok) {
        setSettingsStatus(
          settingsDeleteStatus,
          response?.error || "Impossible de supprimer le compte.",
          true
        );
      }
    }
  );
});

profilePrivateButton.addEventListener("click", () => {
  if (!currentProfileAccountNickname) return;
  profileDialog.close();
  openPrivateMessages(currentProfileAccountNickname);
});

profileBlockButton.addEventListener("click", () => {
  if (!currentProfileAccountNickname) return;
  changeBlockedUser(
    currentProfileAccountNickname,
    currentProfileNickname,
    !currentProfileBlockedByMe
  );
});

profileReportButton.addEventListener("click", () => {
  profileDialog.close();
  openReportDialog({
    kind: "profile",
    target: currentProfileAccountNickname || currentProfileNickname,
    targetDisplay: currentProfileNickname,
  });
});

privateCloseButton.addEventListener("click", () => {
  privateDialog.close();
});

privateDialog.addEventListener("click", (event) => {
  if (event.target === privateDialog) privateDialog.close();
});

privateMessageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = privateMessageInput.value.trim();
  if (!text || !activePrivateAccount) return;

  socket.emit("private-action", {
    action: "send",
    nickname: activePrivateAccount,
    text,
  });
  privateMessageInput.value = "";
  privateMessageInput.focus();
});

privateBlockButton.addEventListener("click", () => {
  if (!activePrivateAccount) return;
  const conversation = privateConversations.find(
    (item) => item.accountNickname === activePrivateAccount
  );
  changeBlockedUser(
    activePrivateAccount,
    conversation?.nickname || privateNickname.textContent,
    !activePrivateBlockedByMe
  );
});

reportCloseButton.addEventListener("click", () => {
  reportDialog.close();
});

reportDialog.addEventListener("click", (event) => {
  if (event.target === reportDialog) reportDialog.close();
});

reportForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!pendingReport) return;

  socket.emit("report-action", {
    action: "create",
    ...pendingReport,
    reason: reportReason.value,
    details: reportDetails.value,
  });
});

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  socket.emit("profile-action", {
    action: "update",
    bio: profileBioInput.value,
    avatarUrl: selectedAvatar === null ? profileAvatarInput.value : selectedAvatar,
  });
});

profileAvatarFileInput.addEventListener("change", async () => {
  const file = profileAvatarFileInput.files[0];
  if (!file) return;

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    alert("Choisis une image JPG, PNG ou WebP.");
    profileAvatarFileInput.value = "";
    return;
  }

  if (file.size > 8 * 1024 * 1024) {
    alert("Cette image est trop lourde. La taille maximale est de 8 Mo.");
    profileAvatarFileInput.value = "";
    return;
  }

  try {
    selectedAvatar = await resizeAvatar(file);
    profileAvatarInput.value = "";
    setAvatar(profileAvatarImage, profileAvatarFallback, selectedAvatar, currentNickname);
  } catch {
    alert("Impossible de lire cette image.");
    profileAvatarFileInput.value = "";
  }
});

profileAvatarInput.addEventListener("change", () => {
  selectedAvatar = null;
  setAvatar(
    profileAvatarImage,
    profileAvatarFallback,
    profileAvatarInput.value.trim(),
    currentNickname
  );
});

profileRemoveAvatarButton.addEventListener("click", () => {
  selectedAvatar = "";
  profileAvatarFileInput.value = "";
  profileAvatarInput.value = "";
  setAvatar(profileAvatarImage, profileAvatarFallback, "", currentNickname);
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

adminRefreshSecurityButton.addEventListener("click", () => {
  socket.emit("security-action", {
    action: "list",
  });
});

adminRefreshReportsButton.addEventListener("click", () => {
  socket.emit("report-action", {
    action: "list",
  });
});

adminRefreshContactsButton.addEventListener("click", () => {
  socket.emit("contact-action", {
    action: "list",
  });
});

socket.on("history", (history) => {
  messages.innerHTML = "";
  currentRoomMessages.clear();
  clearMessageAction();
  history.forEach((message) => {
    currentRoomMessages.set(message.id, message);
    renderMessage(message);
  });
  renderPinnedMessage();
  runMessageSearch({ focusResult: false });
  scrollToLatest();
});

socket.on("message", (message) => {
  currentRoomMessages.set(message.id, message);
  renderMessage(message);
  renderPinnedMessage();
  runMessageSearch({ focusResult: false, preserveCurrent: true });
  if (messageSearchForm.classList.contains("hidden")) scrollToLatest();
});

socket.on("message-updated", (message) => {
  currentRoomMessages.set(message.id, message);
  renderMessage(message);
  renderPinnedMessage();
  runMessageSearch({ focusResult: false, preserveCurrent: true });
  if (activeMessageAction?.id === message.id && message.deletedAt) {
    clearMessageAction();
  }
});

socket.on("typing-users", ({ room, nicknames = [] }) => {
  if (room !== currentRoom) return;
  const otherNicknames = Array.isArray(nicknames)
    ? nicknames.filter((nickname) => nickname !== currentNickname)
    : [];
  renderTypingIndicator(otherNicknames);
});

socket.on("room-activity", (activity) => {
  const roomIsOpen = activity.room === currentRoom;
  const pageIsVisible = !document.hidden && document.hasFocus();

  if (!roomIsOpen || !pageIsVisible) {
    unreadByRoom.set(activity.room, (unreadByRoom.get(activity.room) || 0) + 1);
    renderRoomList();
    updateDocumentTitle();
  }

  if (activity.mentioned) {
    notifyUser(
      `Mention de ${activity.nickname}`,
      `#${activity.room} - ${activity.text}`,
      `mention-${activity.id}`,
      () => switchRoom(activity.room)
    );
  }
});

socket.on("users", (users) => {
  currentUsers = users;
  const me = users.find((user) => user.nickname === currentNickname);
  if (me) {
    currentRole = me.role;
    currentGender = normalizeGender(me.gender);
    currentPresenceStatus = me.presenceStatus || "online";
    presenceSelect.value = currentPresenceStatus;
  }

  memberCount.textContent = String(users.length);
  updateCurrentUserSummary();
  userList.innerHTML = "";
  users.forEach((user) => {
    const item = document.createElement("li");
    item.className = user.nickname === currentNickname ? "is-me" : "";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "profile-user-button";
    button.title = `Voir le profil de ${user.nickname}`;
    const avatar = createAvatar(user, "small");
    avatar.classList.add(`presence-${user.presenceStatus || "online"}`);
    button.append(avatar);

    const copy = document.createElement("span");
    copy.className = "profile-user-copy";

    const name = document.createElement("strong");
    name.textContent = user.nickname;
    applyGenderClass(name, user.gender);
    applyRoleClass(name, user.role);

    const role = document.createElement("small");
    const roleLabel =
      user.role === "admin" || user.role === "moderator"
        ? formatRole(user.role)
        : user.account
          ? "membre"
          : "invite";
    role.textContent = `${formatPresence(user.presenceStatus)} - ${roleLabel}`;

    copy.append(name, role);
    button.append(copy);
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
  currentRooms = rooms;
  renderRoomList();
});

function renderRoomList() {
  roomList.innerHTML = "";
  currentRooms.forEach((room) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = room.name === currentRoom ? "room active" : "room";

    const name = document.createElement("span");
    name.textContent = `#${room.name}`;

    const stats = document.createElement("span");
    stats.className = "room-stats";

    const users = document.createElement("small");
    users.className = "room-user-count";
    users.textContent = String(room.users);
    users.title = `${room.users} connecte${room.users > 1 ? "s" : ""}`;
    stats.append(users);

    const unread = unreadByRoom.get(room.name) || 0;
    if (unread > 0) {
      const unreadBadge = document.createElement("small");
      unreadBadge.className = "room-unread-count";
      unreadBadge.textContent = unread > 99 ? "99+" : String(unread);
      unreadBadge.title = `${unread} message${unread > 1 ? "s" : ""} non lu${unread > 1 ? "s" : ""}`;
      stats.append(unreadBadge);
    }

    button.append(name, stats);
    button.title = room.topic;
    button.addEventListener("click", () => {
      switchRoom(room.name);
      closeMobilePanels();
    });
    roomList.append(button);
  });
}

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

socket.on("security-events", (events) => {
  currentSecurityEvents = events;
  renderSecurityEvents();
});

socket.on("reports", (reports) => {
  currentReports = reports;
  renderReports();
});

socket.on("contact-messages", (contactMessages) => {
  currentContactMessages = contactMessages;
  renderContactMessages();
});

socket.on("report-created", () => {
  pendingReport = null;
  reportDialog.close();
  alert("Signalement envoye a l'equipe de moderation.");
});

socket.on("report-error", ({ text }) => {
  alert(text);
});

socket.on("profile", (profile) => {
  renderProfile(profile);
});

socket.on("account-updated", ({ nickname }) => {
  currentNickname = nickname;
  updateCurrentUserSummary();
  if (settingsDialog.open) settingsDisplayName.value = nickname;
});

socket.on("email-verified", ({ email }) => {
  if (emailVerificationDialog.open) {
    emailVerificationTitle.textContent = "Adresse e-mail verifiee";
    emailVerificationMessage.textContent =
      "Ton adresse est confirmee. La recuperation du mot de passe est active.";
    emailVerificationAddress.textContent = email || activeVerificationEmail;
    emailVerificationResendButton.classList.add("hidden");
    setSettingsStatus(emailVerificationStatus, "Verification terminee.");
  }
  if (settingsDialog.open) {
    socket.emit("settings-action", { action: "get" }, (response) => {
      if (response?.ok) renderAccountSettings(response.settings);
    });
  }
});

socket.on("account-deleted", () => {
  alert("Ton compte a ete supprime.");
  window.location.reload();
});

socket.on("sessions-revoked", ({ reason }) => {
  alert(reason || "Ta session a ete fermee. Reconnecte-toi.");
  logoutCurrentSession();
});

socket.on("private-state", (state) => {
  privateConversations = state.conversations;
  privateUnreadTotal = state.totalUnread;
  renderPrivateState(state.totalUnread);
  updateDocumentTitle();
});

socket.on("private-conversation", (conversation) => {
  renderPrivateConversation(conversation);
});

socket.on("private-message", (message) => {
  if (
    privateDialog.open &&
    activePrivateAccount === message.counterpartAccount
  ) {
    renderPrivateMessage(message);
    scrollPrivateMessages();

    if (!message.fromMe) {
      socket.emit("private-action", {
        action: "mark-read",
        nickname: activePrivateAccount,
      });
    }
  }

  if (!message.fromMe) {
    const conversationIsOpen =
      privateDialog.open && activePrivateAccount === message.counterpartAccount;
    if (!conversationIsOpen || document.hidden || !document.hasFocus()) {
      notifyUser(
        `Message prive de ${message.counterpartNickname}`,
        message.text,
        `private-${message.id}`,
        () => openPrivateMessages(message.counterpartAccount)
      );
    }
  }
});

socket.on("private-block-changed", ({ nickname }) => {
  if (privateDialog.open && activePrivateAccount === nickname) {
    socket.emit("private-action", {
      action: "open",
      nickname,
    });
  }
});

socket.on("user-block-changed", ({ accountNickname }) => {
  if (
    profileDialog.open &&
    currentProfileAccountNickname === accountNickname
  ) {
    requestProfile(accountNickname);
  }
  if (settingsDialog.open) {
    socket.emit("settings-action", { action: "get" }, (response) => {
      if (response?.ok) renderAccountSettings(response.settings);
    });
  }
});

socket.on("private-error", ({ text }) => {
  alert(text);
});

function switchRoom(room) {
  if (room === currentRoom) {
    markCurrentRoomRead();
    return;
  }

  stopTyping();
  closeMessageSearch();
  pinnedMessageBanner.classList.add("hidden");
  socket.emit("switch-room", room, (response) => {
    if (!response?.ok) return;
    clearMessageAction();
    currentRoom = response.room;
    if (currentAccount) {
      localStorage.setItem("tchateliaLastRoom", currentRoom);
    }
    roomName.textContent = `#${response.room}`;
    roomTopic.textContent = response.topic;
    renderTypingIndicator([]);
    unreadByRoom.delete(response.room);
    renderRoomList();
    updateDocumentTitle();
  });
}

function openMessageSearch() {
  messageSearchForm.classList.remove("hidden");
  messageSearchToggleButton.setAttribute("aria-expanded", "true");
  updateFavoritesFilter();
  messageSearchInput.focus();
  runMessageSearch({ focusResult: false });
}

function closeMessageSearch() {
  messageSearchForm.classList.add("hidden");
  messageSearchToggleButton.setAttribute("aria-expanded", "false");
  messageSearchInput.value = "";
  favoritesOnly = false;
  updateFavoritesFilter();
  messageSearchResults = [];
  messageSearchIndex = -1;
  messageSearchCount.textContent = "0 resultat";
  messageSearchPrevious.disabled = true;
  messageSearchNext.disabled = true;
  clearMessageSearchClasses();
}

function runMessageSearch({ focusResult = true, preserveCurrent = false } = {}) {
  const query = normalizeMessageSearch(messageSearchInput.value);
  const previousId =
    preserveCurrent && messageSearchIndex >= 0
      ? messageSearchResults[messageSearchIndex]
      : "";
  clearMessageSearchClasses();

  if (!query && !favoritesOnly) {
    messageSearchResults = [];
    messageSearchIndex = -1;
    messageSearchCount.textContent = "0 resultat";
    messageSearchPrevious.disabled = true;
    messageSearchNext.disabled = true;
    return;
  }

  const matchingRows = [...messages.querySelectorAll(".message")].filter(
    (row) =>
      (!favoritesOnly || row.dataset.favorite === "true") &&
      (!query || String(row.dataset.searchText || "").includes(query))
  );
  messageSearchResults = matchingRows.map((row) => row.dataset.messageId);
  messageSearchIndex = previousId
    ? messageSearchResults.indexOf(previousId)
    : messageSearchResults.length
      ? 0
      : -1;
  if (messageSearchIndex < 0 && messageSearchResults.length) {
    messageSearchIndex = 0;
  }

  matchingRows.forEach((row) => row.classList.add("is-search-match"));
  const resultCount = messageSearchResults.length;
  messageSearchCount.textContent = `${resultCount} resultat${resultCount > 1 ? "s" : ""}`;
  messageSearchPrevious.disabled = resultCount === 0;
  messageSearchNext.disabled = resultCount === 0;

  if (resultCount) {
    markCurrentSearchResult(focusResult);
  }
}

function updateFavoritesFilter() {
  messageFavoritesFilter.classList.toggle("hidden", !currentAccount);
  messageFavoritesFilter.classList.toggle("is-active", favoritesOnly);
  messageFavoritesFilter.setAttribute("aria-pressed", String(favoritesOnly));
}

function goToSearchResult(direction) {
  if (!messageSearchResults.length) return;
  messageSearchIndex =
    (messageSearchIndex + direction + messageSearchResults.length) %
    messageSearchResults.length;
  markCurrentSearchResult(true);
}

function markCurrentSearchResult(shouldScroll) {
  for (const row of messages.querySelectorAll(".message")) {
    row.classList.remove("is-search-current");
  }

  const messageId = messageSearchResults[messageSearchIndex];
  const row = [...messages.children].find(
    (candidate) => candidate.dataset.messageId === messageId
  );
  if (!row) return;
  row.classList.add("is-search-current");
  if (shouldScroll) {
    row.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function clearMessageSearchClasses() {
  for (const row of messages.querySelectorAll(".message")) {
    row.classList.remove("is-search-match", "is-search-current");
  }
}

function normalizeMessageSearch(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .trim();
}

function openMobilePanel(panel) {
  closeMobilePanels();
  panel.classList.add("is-open");
  chatPanel.classList.add("is-mobile-panel-open");
}

function closeMobilePanels() {
  roomSidebar.classList.remove("is-open");
  memberSidebar.classList.remove("is-open");
  chatPanel.classList.remove("is-mobile-panel-open");
}

function showChat(response) {
  document.body.classList.add("chat-active");
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  window.scrollTo(0, 0);
  loginPanel.classList.add("hidden");
  chatPanel.classList.remove("hidden");
  roomName.textContent = `#${response.room}`;
  roomTopic.textContent = response.topic;
  myProfileButton.classList.toggle("hidden", !currentAccount);
  privateMessagesButton.classList.toggle("hidden", !currentAccount);
  favoriteMessagesButton.classList.toggle("hidden", !currentAccount);
  messageFavoritesFilter.classList.toggle("hidden", !currentAccount);
  sidebarProfileButton.classList.toggle("hidden", !currentAccount);
  accountSettingsButton.classList.toggle("hidden", !currentAccount);
  updateCurrentUserSummary();
  markCurrentRoomRead();
  updateNotificationButton();
  renderAdminPanel();
  messageInput.focus();
  window.requestAnimationFrame(() => {
    chatPanel.scrollTop = 0;
    window.scrollTo(0, 0);
  });
}

function markCurrentRoomRead() {
  if (!currentRoom || document.hidden) return;
  if (unreadByRoom.delete(currentRoom)) {
    renderRoomList();
  }
  updateDocumentTitle();
}

function updateCurrentUserSummary() {
  currentUserName.textContent = currentNickname || "Invite";
  applyGenderClass(currentUserName, currentGender);
  applyRoleClass(currentUserName, currentRole);
  currentUserRole.textContent =
    currentRole === "admin" || currentRole === "moderator"
      ? formatRole(currentRole)
      : currentAccount
        ? "membre"
        : "invite";
  currentUserInitials.textContent = getInitials(currentNickname);
  currentUserInitials.classList.remove(
    "presence-online",
    "presence-away",
    "presence-busy"
  );
  currentUserInitials.classList.add(`presence-${currentPresenceStatus}`);
}

function renderAdminPanel() {
  const canModerate = currentRole === "admin" || currentRole === "moderator";
  const canManage = currentRole === "admin";

  if (!canModerate) {
    adminPanel.classList.add("hidden");
    adminPanelButton.classList.add("hidden");
    sidebarCreateRoomButton.classList.add("hidden");
    if (adminDialog.open) adminDialog.close();
    adminUserList.innerHTML = "";
    adminAccountList.innerHTML = "";
    adminModerationLogList.innerHTML = "";
    adminSecurityList.innerHTML = "";
    adminReportList.innerHTML = "";
    adminContactList.innerHTML = "";
    return;
  }

  adminPanel.classList.remove("hidden");
  adminPanelButton.classList.remove("hidden");
  sidebarCreateRoomButton.classList.toggle("hidden", !canManage);
  adminUserList.innerHTML = "";
  adminRoomCreateForm.classList.toggle("hidden", !canManage);
  adminRoomTopicForm.classList.toggle("hidden", !canManage);
  adminDeleteRoomButton.classList.toggle("hidden", !canManage);
  adminAccountPanel.classList.toggle("hidden", !canManage);
  adminModerationLogPanel.classList.toggle("hidden", !canManage);
  adminSecurityPanel.classList.toggle("hidden", !canManage);
  adminContactPanel.classList.toggle("hidden", !canManage);
  adminDeleteRoomButton.disabled = currentRoom === "accueil";
  socket.emit("report-action", {
    action: "list",
  });

  if (canManage) {
    socket.emit("account-action", {
      action: "list",
    });
    socket.emit("moderation-log-action", {
      action: "list",
    });
    socket.emit("security-action", {
      action: "list",
    });
    socket.emit("contact-action", {
      action: "list",
    });
  } else {
    adminAccountList.innerHTML = "";
    adminModerationLogList.innerHTML = "";
    adminSecurityList.innerHTML = "";
    adminContactList.innerHTML = "";
  }

  currentUsers.forEach((user) => {
    const row = document.createElement("div");
    row.className = "admin-user";

    const name = document.createElement("span");
    name.textContent = formatUserName(user);
    applyRoleClass(name, user.role);
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
  renderSecurityEvents();
  renderReports();
  renderContactMessages();
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
      const password = prompt(
        `Nouveau mot de passe pour ${account.displayName} (${minimumPasswordLength} caracteres minimum)`
      );
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

function renderSecurityEvents() {
  if (currentRole !== "admin") return;

  adminSecurityEventCount.textContent = String(currentSecurityEvents.length);
  adminSecurityList.innerHTML = "";

  if (!currentSecurityEvents.length) {
    const empty = document.createElement("p");
    empty.className = "admin-empty";
    empty.textContent = "Aucun incident de securite.";
    adminSecurityList.append(empty);
    return;
  }

  currentSecurityEvents.forEach((securityEvent) => {
    const row = document.createElement("article");
    row.className = `admin-security-event ${securityEvent.eventType}`;

    const title = document.createElement("strong");
    title.textContent = formatSecurityEvent(securityEvent.eventType);

    const details = document.createElement("span");
    details.textContent = securityEvent.details;

    const meta = document.createElement("small");
    const date = new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(Number(securityEvent.createdAt));
    meta.textContent = `${date} - source ${securityEvent.identityHash}`;

    row.append(title, details, meta);
    adminSecurityList.append(row);
  });
}

function formatSecurityEvent(eventType) {
  const labels = {
    account_password_failure: "Mot de passe incorrect",
    admin_password_failure: "Acces admin refuse",
    admin_ip_denied: "Adresse IP admin refusee",
    unknown_account: "Compte inconnu",
    temporary_lock: "Verrouillage temporaire",
    access_rate_limit: "Trop de tentatives",
    connection_limit: "Trop de connexions",
    registration_limit: "Trop d'inscriptions",
    captcha_failure: "Verification anti-robot refusee",
  };
  return labels[eventType] || eventType;
}

function renderReports() {
  if (currentRole !== "admin" && currentRole !== "moderator") return;

  adminReportList.innerHTML = "";

  if (!currentReports.length) {
    const empty = document.createElement("p");
    empty.className = "admin-empty";
    empty.textContent = "Aucun signalement.";
    adminReportList.append(empty);
    return;
  }

  currentReports.forEach((report) => {
    const row = document.createElement("article");
    row.className = `admin-report ${report.status}`;

    const title = document.createElement("strong");
    title.textContent = `${formatReportKind(report.kind)} : ${report.targetDisplay}`;

    const reason = document.createElement("span");
    reason.textContent = `Motif : ${formatReportReason(report.reason)}`;

    const snapshot = document.createElement("p");
    snapshot.textContent = report.contentSnapshot || "Aucun contenu.";

    const meta = document.createElement("small");
    const date = new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(Number(report.createdAt));
    meta.textContent = `${date} - par ${report.reporterDisplay} - ${report.room}`;

    row.append(title, reason, snapshot);
    if (report.details) {
      const details = document.createElement("small");
      details.textContent = `Precision : ${report.details}`;
      row.append(details);
    }
    row.append(meta);

    if (report.status === "open") {
      const actions = document.createElement("div");
      actions.className = "admin-report-actions";
      actions.append(
        createReportActionButton("Traite", "resolve", report.id),
        createReportActionButton("Rejeter", "dismiss", report.id)
      );
      row.append(actions);
    } else {
      const status = document.createElement("small");
      status.className = "admin-report-status";
      status.textContent =
        report.status === "resolved"
          ? `Traite par ${report.handledBy}`
          : `Rejete par ${report.handledBy}`;
      row.append(status);
    }

    adminReportList.append(row);
  });
}

function createReportActionButton(label, action, id) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", () => {
    socket.emit("report-action", {
      action,
      id,
    });
  });
  return button;
}

function formatReportKind(kind) {
  const labels = {
    profile: "Profil",
    public_message: "Message public",
    private_message: "Message prive",
  };
  return labels[kind] || kind;
}

function formatReportReason(reason) {
  const labels = {
    spam: "Spam",
    harassment: "Harcelement",
    inappropriate: "Contenu inapproprie",
    other: "Autre",
  };
  return labels[reason] || reason;
}

function renderContactMessages() {
  if (currentRole !== "admin") return;

  adminContactList.innerHTML = "";
  if (!currentContactMessages.length) {
    const empty = document.createElement("p");
    empty.className = "admin-empty";
    empty.textContent = "Aucune demande de contact.";
    adminContactList.append(empty);
    return;
  }

  currentContactMessages.forEach((contactMessage) => {
    const row = document.createElement("article");
    row.className = `admin-contact ${contactMessage.status}`;

    const title = document.createElement("strong");
    title.textContent = `${formatContactSubject(contactMessage.subject)} - ${contactMessage.name}`;

    const email = document.createElement("a");
    email.href = `mailto:${contactMessage.email}`;
    email.textContent = contactMessage.email;

    const message = document.createElement("p");
    message.textContent = contactMessage.message;

    const meta = document.createElement("small");
    meta.textContent = new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(Number(contactMessage.createdAt));

    row.append(title, email, message, meta);

    if (contactMessage.status === "open") {
      const resolveButton = document.createElement("button");
      resolveButton.type = "button";
      resolveButton.textContent = "Marquer traite";
      resolveButton.addEventListener("click", () => {
        socket.emit("contact-action", {
          action: "resolve",
          id: contactMessage.id,
        });
      });
      row.append(resolveButton);
    } else {
      const status = document.createElement("small");
      status.textContent = `Traite par ${contactMessage.handledBy}`;
      row.append(status);
    }

    adminContactList.append(row);
  });
}

function formatContactSubject(subject) {
  const labels = {
    general: "Question",
    account: "Compte",
    moderation: "Moderation",
    privacy: "Donnees personnelles",
    other: "Autre",
  };
  return labels[subject] || subject;
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
    message_deleted: "Message supprime",
    report_resolved: "Signalement traite",
    report_dismissed: "Signalement rejete",
    contact_resolved: "Contact traite",
  };
  return labels[action] || action;
}

function formatRole(role) {
  if (role === "admin") return "admin";
  if (role === "moderator") return "moderateur";
  return "utilisateur";
}

function formatPresence(status) {
  return PRESENCE_LABELS[status] || PRESENCE_LABELS.online;
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

function changeBlockedUser(accountNickname, displayName, shouldBlock) {
  if (!currentAccount || !accountNickname) return;

  const keepsModerationVisibility =
    currentRole === "admin" || currentRole === "moderator";
  const confirmation = shouldBlock
    ? keepsModerationVisibility
      ? `Bloquer ${displayName} ? Les messages prives seront bloques. Ses messages publics resteront visibles pour la moderation.`
      : `Bloquer ${displayName} ? Ses messages publics seront masques et les messages prives seront bloques.`
    : `Debloquer ${displayName} ?`;
  if (!confirm(confirmation)) return;

  socket.emit(
    "block-action",
    {
      nickname: accountNickname,
      blocked: shouldBlock,
    },
    (response) => {
      if (!response?.ok) {
        alert(response?.error || "Le blocage n'a pas pu etre modifie.");
        return;
      }

      if (response.settings && settingsDialog.open) {
        renderAccountSettings(response.settings);
      }
      alert(
        shouldBlock
          ? `${response.displayName} a ete bloque.`
          : `${response.displayName} a ete debloque.`
      );
    }
  );
}

function openAccountSettings() {
  if (!currentAccount) return;
  closeMobilePanels();
  settingsGeneralForm.reset();
  settingsPasswordForm.reset();
  settingsDeleteForm.reset();
  settingsNotifications.checked = alertsEnabled;
  updateThemeControls();
  settingsBlockedList.innerHTML = "";
  settingsBlockedCount.textContent = "0";
  setSettingsStatus(settingsGeneralStatus, "");
  setSettingsStatus(settingsPasswordStatus, "");
  setSettingsStatus(settingsSessionsStatus, "");
  setSettingsStatus(settingsDeleteStatus, "");

  socket.emit("settings-action", { action: "get" }, (response) => {
    if (!response?.ok) {
      alert(response?.error || "Impossible d'ouvrir les parametres.");
      return;
    }
    renderAccountSettings(response.settings);
    if (!settingsDialog.open) settingsDialog.showModal();
  });
}

function renderAccountSettings(settings) {
  if (!settings) return;
  settingsAccountNickname.textContent = settings.accountNickname;
  settingsDisplayName.value = settings.displayName;
  settingsEmail.value = settings.email || "";
  settingsEmailVerificationState.textContent = settings.emailVerified
    ? "Adresse verifiee"
    : "Adresse a verifier";
  settingsEmailVerificationState.classList.toggle(
    "is-verified",
    Boolean(settings.emailVerified)
  );
  settingsResendVerificationButton.classList.toggle(
    "hidden",
    Boolean(settings.emailVerified) || !emailVerificationEnabled
  );
  settingsNotifications.checked = alertsEnabled;
  settingsPrivateMessages.checked = settings.privateMessagesEnabled;
  updateThemeControls();
  settingsBlockedList.innerHTML = "";
  settingsBlockedCount.textContent = String(settings.blockedUsers.length);

  if (!settings.blockedUsers.length) {
    const empty = document.createElement("p");
    empty.className = "settings-empty";
    empty.textContent = "Aucun utilisateur bloque.";
    settingsBlockedList.append(empty);
    return;
  }

  settings.blockedUsers.forEach((blockedUser) => {
    const row = document.createElement("div");
    row.className = "settings-blocked-user";

    const name = document.createElement("strong");
    name.textContent = blockedUser.displayName;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Debloquer";
    button.addEventListener("click", () => {
      button.disabled = true;
      socket.emit(
        "settings-action",
        {
          action: "unblock",
          nickname: blockedUser.accountNickname,
        },
        (response) => {
          if (!response?.ok) {
            button.disabled = false;
            setSettingsStatus(
              settingsGeneralStatus,
              response?.error || "Impossible de debloquer ce compte.",
              true
            );
            return;
          }
          renderAccountSettings(response.settings);
          setSettingsStatus(settingsGeneralStatus, `${blockedUser.displayName} a ete debloque.`);
        }
      );
    });

    row.append(name, button);
    settingsBlockedList.append(row);
  });
}

function setSettingsStatus(element, text, isError = false) {
  element.textContent = text;
  element.classList.toggle("is-error", isError);
}

function renderProfile(profile) {
  currentProfileAccountNickname = profile.accountNickname || "";
  currentProfileNickname = profile.nickname;
  currentProfileBlockedByMe = Boolean(profile.blockedByMe);
  profileNickname.textContent = profile.nickname;
  applyGenderClass(profileNickname, profile.gender);
  applyRoleClass(profileNickname, profile.role);
  profileRole.textContent = profile.account ? formatRole(profile.role) : "invite";
  profileBio.textContent = profile.bio || "Aucune description.";
  profileMemberSince.textContent = profile.account
    ? `Membre depuis le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
        Number(profile.createdAt)
      )}`
    : "Profil invite";

  setAvatar(profileAvatarImage, profileAvatarFallback, profile.avatarUrl, profile.nickname);

  profileForm.classList.toggle("hidden", !profile.isOwn);
  profilePrivateButton.classList.toggle(
    "hidden",
    !currentAccount ||
      !profile.account ||
      profile.isOwn ||
      profile.blockedByMe ||
      profile.blockedByThem ||
      profile.privateMessagesEnabled === false
  );
  profileBlockButton.classList.toggle(
    "hidden",
    !currentAccount || !profile.account || profile.isOwn
  );
  profileBlockButton.textContent = profile.blockedByMe ? "Debloquer" : "Bloquer";
  profileReportButton.classList.toggle("hidden", !currentAccount || profile.isOwn);
  if (profile.isOwn) {
    selectedAvatar = profile.avatarUrl?.startsWith("data:image/") ? profile.avatarUrl : null;
    profileAvatarFileInput.value = "";
    profileAvatarInput.value = selectedAvatar === null ? profile.avatarUrl || "" : "";
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

function normalizeGender(value) {
  const gender = String(value || "").trim().toLocaleLowerCase("fr-FR");
  return GENDER_CLASS_NAMES.includes(`gender-${gender}`) ? gender : "other";
}

function applyGenderClass(element, gender) {
  element.classList.remove(...GENDER_CLASS_NAMES);
  element.classList.add(`gender-${normalizeGender(gender)}`);
}

function normalizeDisplayRole(value) {
  return value === "admin" || value === "moderator" ? value : "user";
}

function applyRoleClass(element, role) {
  element.classList.remove(...ROLE_CLASS_NAMES);
  const normalizedRole = normalizeDisplayRole(role);
  if (normalizedRole !== "user") {
    element.classList.add(`role-${normalizedRole}`);
  }
}

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function setTheme(theme, { persist = true } = {}) {
  currentTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = currentTheme;
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
    } catch {
      // The selected theme still applies for the current page.
    }
  }
  updateThemeControls();
}

function updateThemeControls() {
  const lightTheme = currentTheme === "light";
  themeToggleIcon.textContent = lightTheme ? "\u263e" : "\u2600";
  themeToggleLabel.textContent = lightTheme ? "Sombre" : "Clair";
  themeToggleButton.title = lightTheme
    ? "Passer au mode sombre"
    : "Passer au mode clair";
  themeToggleButton.setAttribute("aria-pressed", String(lightTheme));
  settingsThemeInputs.forEach((input) => {
    input.checked = input.value === currentTheme;
  });
}

function openReportDialog(report) {
  if (!currentAccount) {
    alert("Cree un compte pour envoyer un signalement.");
    return;
  }

  pendingReport = {
    kind: report.kind,
    target: report.target || "",
    messageId: report.messageId || "",
  };
  reportTitle.textContent =
    report.kind === "profile"
      ? `Signaler le profil de ${report.targetDisplay}`
      : `Signaler un message de ${report.targetDisplay}`;
  reportContext.textContent =
    report.kind === "private_message"
      ? "Message prive"
      : report.kind === "public_message"
        ? `Message dans #${currentRoom}`
        : "Profil utilisateur";
  reportReason.value = "spam";
  reportDetails.value = "";

  if (!reportDialog.open) reportDialog.showModal();
}

function openPrivateMessages(accountNickname = "") {
  if (!currentAccount) return;
  if (!privateDialog.open) privateDialog.showModal();

  socket.emit("private-action", {
    action: "list",
  });

  if (accountNickname) {
    activePrivateAccount = accountNickname;
    socket.emit("private-action", {
      action: "open",
      nickname: accountNickname,
    });
  }
}

function renderPrivateState(totalUnread) {
  privateUnreadTotal = totalUnread;
  privateUnreadBadge.textContent = totalUnread;
  privateUnreadBadge.classList.toggle("hidden", totalUnread === 0);
  updateDocumentTitle();
  privateConversationList.innerHTML = "";

  if (!privateConversations.length) {
    const empty = document.createElement("p");
    empty.className = "admin-empty";
    empty.textContent = "Aucune conversation.";
    privateConversationList.append(empty);
    return;
  }

  privateConversations.forEach((conversation) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className =
      conversation.accountNickname === activePrivateAccount
        ? "private-conversation-button active"
        : "private-conversation-button";

    button.append(createAvatar(conversation, "small"));

    const content = document.createElement("span");
    content.className = "private-conversation-copy";

    const title = document.createElement("strong");
    title.textContent = conversation.nickname;
    applyGenderClass(title, conversation.gender);
    applyRoleClass(title, conversation.role);

    const preview = document.createElement("small");
    preview.textContent = conversation.lastText;

    content.append(title, preview);
    button.append(content);

    if (conversation.unread > 0) {
      const unread = document.createElement("span");
      unread.className = "private-list-unread";
      unread.textContent = conversation.unread;
      button.append(unread);
    }

    button.addEventListener("click", () => {
      activePrivateAccount = conversation.accountNickname;
      socket.emit("private-action", {
        action: "open",
        nickname: conversation.accountNickname,
      });
    });

    privateConversationList.append(button);
  });
}

function renderPrivateConversation(conversation) {
  activePrivateAccount = conversation.participant.accountNickname;
  activePrivateBlockedByMe = conversation.blockedByMe;

  privateEmpty.classList.add("hidden");
  privateActive.classList.remove("hidden");
  privateNickname.textContent = conversation.participant.nickname;
  applyGenderClass(privateNickname, conversation.participant.gender);
  applyRoleClass(privateNickname, conversation.participant.role);
  setAvatar(
    privateAvatarImage,
    privateAvatarFallback,
    conversation.participant.avatarUrl,
    conversation.participant.nickname
  );

  const unavailable =
    conversation.blockedByMe || conversation.blockedByThem || !conversation.available;
  privateStatus.textContent = !conversation.available
    ? conversation.participant.privateMessagesEnabled === false
      ? "Messages prives desactives"
      : "Compte desactive"
    : conversation.blockedByMe
      ? "Utilisateur bloque"
      : conversation.blockedByThem
        ? "Cette personne vous a bloque"
        : formatRole(conversation.participant.role);

  privateBlockButton.textContent = conversation.blockedByMe ? "Debloquer" : "Bloquer";
  privateMessageInput.disabled = unavailable;
  privateMessageForm.querySelector("button").disabled = unavailable;
  privateMessageInput.placeholder = unavailable
    ? "Conversation indisponible"
    : "Ecris un message prive...";

  privateMessages.innerHTML = "";
  conversation.messages.forEach(renderPrivateMessage);
  scrollPrivateMessages();
  renderPrivateState(
    privateConversations.reduce((total, item) => total + item.unread, 0)
  );
  if (!unavailable) privateMessageInput.focus();
}

function renderPrivateMessage(message) {
  const row = document.createElement("article");
  row.className = message.fromMe ? "private-message from-me" : "private-message";

  const text = document.createElement("p");
  text.textContent = message.text;

  const time = document.createElement("time");
  time.textContent = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(Number(message.createdAt));

  row.append(text, time);

  if (currentAccount && !message.fromMe) {
    const reportButton = document.createElement("button");
    reportButton.type = "button";
    reportButton.className = "message-report-button";
    reportButton.textContent = "Signaler";
    reportButton.addEventListener("click", () => {
      privateDialog.close();
      openReportDialog({
        kind: "private_message",
        targetDisplay: privateNickname.textContent,
        messageId: message.id,
      });
    });
    row.append(reportButton);
  }
  privateMessages.append(row);
}

function scrollPrivateMessages() {
  privateMessages.scrollTop = privateMessages.scrollHeight;
}

function resizeAvatar(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement("canvas");
      const size = 320;
      const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
      const sourceX = (image.naturalWidth - sourceSize) / 2;
      const sourceY = (image.naturalHeight - sourceSize) / 2;
      canvas.width = size;
      canvas.height = size;

      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, size, size);
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        size,
        size
      );

      const avatar = canvas.toDataURL("image/jpeg", 0.82);
      if (avatar.length > 340_000) {
        reject(new Error("Compressed image is too large"));
        return;
      }
      resolve(avatar);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Invalid image"));
    };

    image.src = objectUrl;
  });
}

function updateAuthModeRequirements() {
  const mode = document.querySelector('input[name="authMode"]:checked')?.value;
  accountPasswordInput.required = mode === "login" || mode === "register";
  accountPasswordInput.minLength =
    mode === "register" ? minimumPasswordLength : 0;
  accountPasswordInput.maxLength = maximumPasswordLength;
  accountEmailField.classList.toggle("hidden", mode !== "register");
  accountGenderField.classList.toggle("hidden", mode !== "register");
  accountEmailInput.required = mode === "register";
  adminAccessField.classList.toggle("hidden", !adminAccessAllowed);
  adminPasswordInput.disabled = !adminAccessAllowed;
  if (!adminAccessAllowed) adminPasswordInput.value = "";
  forgotPasswordButton.classList.toggle(
    "hidden",
    mode !== "login" || !passwordResetEnabled
  );
  accountPasswordInput.placeholder =
    mode === "register"
      ? `${minimumPasswordLength} caracteres minimum`
      : mode === "login"
        ? "Mot de passe du compte"
        : "Optionnel";
}

function activateLoginMode(mode) {
  const input = document.querySelector(`input[name="authMode"][value="${mode}"]`);
  if (input) {
    input.checked = true;
    updateAuthModeRequirements();
  }
  loginForm.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "center",
  });
  window.setTimeout(() => nicknameInput.focus(), 220);
}

function updatePopularRoomCounts(rooms = []) {
  const counts = new Map(
    rooms.map((room) => [String(room.name || ""), Number(room.users) || 0])
  );
  popularRoomCounts.forEach((element) => {
    element.textContent = String(counts.get(element.dataset.roomCount) || 0);
  });
}

async function initializeApplication() {
  await initializePublicProtection();
  const query = new URLSearchParams(window.location.search);
  if (query.has("resetToken") || query.has("verifyEmail")) return;
  await tryAutomaticLogin();
}

async function tryAutomaticLogin() {
  try {
    const response = await fetch("/api/session", {
      headers: { accept: "application/json" },
      credentials: "same-origin",
    });
    if (!response.ok) return;
    const session = await response.json();
    if (!session?.ok || !session.account?.nickname) return;

    joinChat(
      {
        nickname: session.account.nickname,
        room: localStorage.getItem("tchateliaLastRoom") || "accueil",
        adminPassword: "",
        accountPassword: "",
        accountEmail: "",
        accountGender: "",
        authMode: "session",
        legalAccepted: true,
        turnstileToken: "",
      },
      { automatic: true }
    );
  } catch {
    // The normal login form remains available when a saved session cannot be read.
  }
}

async function createBrowserSession({ nickname, password, turnstileToken: captchaToken }) {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({
      nickname,
      password,
      turnstileToken: captchaToken,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  return {
    ...payload,
    ok: response.ok && payload.ok === true,
  };
}

function reconnectSocketForSession() {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      socket.off("connect", handleConnect);
      reject(new Error("Socket reconnection timeout"));
    }, 5000);
    const handleConnect = () => {
      window.clearTimeout(timeout);
      resolve();
    };
    socket.once("connect", handleConnect);
    if (socket.connected) socket.disconnect();
    socket.connect();
  });
}

function joinChat(payload, { automatic = false } = {}) {
  currentNickname = String(payload.nickname || "");
  currentAccount = payload.authMode !== "guest";
  socket.emit("join", payload, (response) => {
    if (!response?.ok) {
      currentAccount = false;
      if (response?.sessionExpired) {
        logoutCurrentSession({ reload: false });
        if (!automatic) {
          alert(response.error || "Ta session a expire. Connecte-toi de nouveau.");
        }
        return;
      }
      handleJoinFailure(response, { automatic });
      return;
    }

    currentRoom = response.room;
    currentNickname = response.nickname;
    currentRole = response.role;
    currentGender = normalizeGender(response.gender);
    currentAccount = response.account;
    currentAccountNickname = response.accountNickname;
    if (currentAccount) {
      localStorage.setItem("tchateliaLastRoom", currentRoom);
    }
    showChat(response);
  });
}

function handleJoinFailure(response = {}, { automatic = false } = {}) {
  currentAccount = false;
  resetTurnstile();
  if (response.verificationRequired) {
    openEmailVerificationDialog({
      email: response.email,
      message: response.message,
    });
    return;
  }
  if (!automatic) {
    alert(response.error || "Impossible d'entrer dans le chat.");
  }
}

async function logoutCurrentSession({ reload = true } = {}) {
  try {
    await fetch("/api/session", {
      method: "DELETE",
      headers: { accept: "application/json" },
      credentials: "same-origin",
    });
  } catch {
    // Reloading still clears the current chat state if the network request fails.
  }
  if (reload) window.location.reload();
}

async function initializePublicProtection() {
  try {
    const response = await fetch("/api/public-config", {
      headers: { accept: "application/json" },
    });
    if (!response.ok) return;
    const config = await response.json();
    passwordResetEnabled = Boolean(config.passwordResetEnabled);
    emailVerificationEnabled = Boolean(config.emailVerificationEnabled);
    adminAccessAllowed = config.adminAccessAllowed !== false;
    minimumPasswordLength =
      Number(config.minPasswordLength) || minimumPasswordLength;
    maximumPasswordLength =
      Number(config.maxPasswordLength) || maximumPasswordLength;
    updatePopularRoomCounts(Array.isArray(config.rooms) ? config.rooms : []);
    applyPasswordRequirements();
    updateAuthModeRequirements();
    if (!config.turnstileEnabled || !config.turnstileSiteKey) return;

    loginSecurity.classList.remove("hidden");
    await loadTurnstileScript();
    turnstileWidgetId = window.turnstile.render(turnstileWidget, {
      sitekey: config.turnstileSiteKey,
      theme: "dark",
      size: "flexible",
      callback: (token) => {
        turnstileToken = token;
      },
      "expired-callback": () => {
        turnstileToken = "";
      },
      "error-callback": () => {
        turnstileToken = "";
      },
    });
  } catch {
    loginSecurity.classList.add("hidden");
  }
}

function applyPasswordRequirements() {
  [
    settingsNewPassword,
    settingsConfirmPassword,
    passwordResetNewPassword,
    passwordResetConfirmPassword,
  ].forEach((input) => {
    input.minLength = minimumPasswordLength;
    input.maxLength = maximumPasswordLength;
  });
  [
    accountPasswordInput,
    settingsCurrentPassword,
    settingsDeletePassword,
  ].forEach((input) => {
    input.maxLength = maximumPasswordLength;
  });
}

function openPasswordResetConfirmationFromUrl() {
  const token = new URLSearchParams(window.location.search).get("resetToken") || "";
  if (!/^[a-f0-9]{64}$/i.test(token)) return;

  activePasswordResetToken = token;
  passwordResetTitle.textContent = "Choisir un nouveau mot de passe";
  passwordResetRequestForm.classList.add("hidden");
  passwordResetConfirmForm.classList.remove("hidden");
  setSettingsStatus(passwordResetStatus, "");
  if (!passwordResetDialog.open) passwordResetDialog.showModal();
  passwordResetNewPassword.focus();
}

function openEmailVerificationDialog({ email = "", message = "" } = {}) {
  activeVerificationEmail = String(email || "").trim();
  emailVerificationTitle.textContent = "Confirme ton adresse e-mail";
  emailVerificationMessage.textContent =
    message || "Consulte ta boite de reception et clique sur le lien de confirmation.";
  emailVerificationAddress.textContent = activeVerificationEmail;
  emailVerificationResendButton.classList.toggle(
    "hidden",
    !emailVerificationEnabled || !activeVerificationEmail
  );
  setSettingsStatus(emailVerificationStatus, "");
  if (!emailVerificationDialog.open) emailVerificationDialog.showModal();
}

function requestEmailVerification(email) {
  const cleanEmail = String(email || "").trim();
  if (!cleanEmail) return;
  activeVerificationEmail = cleanEmail;
  emailVerificationResendButton.disabled = true;
  setSettingsStatus(emailVerificationStatus, "Envoi en cours...");
  socket.emit(
    "email-verification-request",
    { email: cleanEmail },
    (response) => {
      emailVerificationResendButton.disabled = false;
      setSettingsStatus(
        emailVerificationStatus,
        response?.message || response?.error || "L'e-mail n'a pas pu etre envoye.",
        !response?.ok
      );
    }
  );
}

function openEmailVerificationFromUrl() {
  const token = new URLSearchParams(window.location.search).get("verifyEmail") || "";
  if (!/^[a-f0-9]{64}$/i.test(token)) return;

  activeVerificationEmail = "";
  emailVerificationTitle.textContent = "Verification de l'adresse";
  emailVerificationMessage.textContent = "Nous verifions ton lien de confirmation.";
  emailVerificationAddress.textContent = "";
  emailVerificationResendButton.classList.add("hidden");
  setSettingsStatus(emailVerificationStatus, "Verification en cours...");
  if (!emailVerificationDialog.open) emailVerificationDialog.showModal();

  socket.emit(
    "email-verification-confirm",
    { token },
    (response) => {
      emailVerificationTitle.textContent = response?.ok
        ? "Adresse e-mail verifiee"
        : "Lien de verification invalide";
      emailVerificationMessage.textContent = response?.ok
        ? "Ton compte est maintenant confirme. Tu peux te connecter."
        : "Demande un nouveau lien depuis l'ecran de connexion.";
      setSettingsStatus(
        emailVerificationStatus,
        response?.message || response?.error || "La verification a echoue.",
        !response?.ok
      );
      if (response?.ok) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  );
}

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-turnstile-api="true"]');
    if (existingScript) {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.turnstileApi = "true";
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", reject, { once: true });
    document.head.append(script);
  });
}

function resetTurnstile() {
  turnstileToken = "";
  if (
    turnstileWidgetId !== null &&
    window.turnstile?.reset
  ) {
    window.turnstile.reset(turnstileWidgetId);
  }
}

function updateNotificationButton() {
  notificationToggleButton.classList.toggle("is-enabled", alertsEnabled);
  notificationToggleButton.setAttribute("aria-pressed", String(alertsEnabled));
  notificationToggleButton.title = alertsEnabled
    ? "Desactiver les alertes"
    : "Activer les alertes";
  notificationState.textContent = alertsEnabled ? "on" : "off";
}

async function setAlertsPreference(enabled, showFeedback = true) {
  if (!enabled) {
    alertsEnabled = false;
    localStorage.removeItem("tchateliaAlerts");
    updateNotificationButton();
    if (showFeedback) {
      showNotificationToast(
        "Alertes desactivees",
        "Les compteurs non lus restent actifs."
      );
    }
    return false;
  }

  if (typeof Notification === "undefined") {
    alertsEnabled = false;
    updateNotificationButton();
    if (showFeedback) {
      showNotificationToast(
        "Notifications indisponibles",
        "Ce navigateur ne prend pas en charge les notifications."
      );
    }
    return false;
  }

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission !== "granted") {
    alertsEnabled = false;
    localStorage.removeItem("tchateliaAlerts");
    updateNotificationButton();
    if (showFeedback) {
      showNotificationToast(
        "Autorisation refusee",
        "Tu peux modifier ce choix dans les reglages du navigateur."
      );
    }
    return false;
  }

  alertsEnabled = true;
  localStorage.setItem("tchateliaAlerts", "enabled");
  ensureAudioContext();
  updateNotificationButton();
  if (showFeedback) {
    showNotificationToast(
      "Alertes activees",
      "Les mentions et messages prives seront signales."
    );
  }
  return true;
}

function updateDocumentTitle() {
  const roomUnread = [...unreadByRoom.values()].reduce(
    (total, unread) => total + unread,
    0
  );
  const totalUnread = roomUnread + privateUnreadTotal;
  document.title = totalUnread > 0 ? `(${totalUnread}) Tchatelia` : "Tchatelia";
}

function ensureAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function playNotificationSound() {
  if (!alertsEnabled) return;
  const context = ensureAudioContext();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(740, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(520, context.currentTime + 0.12);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.16);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.17);
}

function showNotificationToast(title, text, action = null) {
  const toast = document.createElement("button");
  toast.type = "button";
  toast.className = "notification-toast";

  const heading = document.createElement("strong");
  heading.textContent = title;

  const body = document.createElement("span");
  body.textContent = text;

  toast.append(heading, body);
  toast.addEventListener("click", () => {
    toast.remove();
    action?.();
  });
  notificationStack.prepend(toast);

  while (notificationStack.children.length > 4) {
    notificationStack.lastElementChild.remove();
  }

  window.setTimeout(() => toast.remove(), 6000);
}

function notifyUser(title, text, tag, action = null) {
  showNotificationToast(title, text, action);
  playNotificationSound();

  if (
    !alertsEnabled ||
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  const notification = new Notification(title, {
    body: text,
    tag,
  });
  notification.addEventListener("click", () => {
    window.focus();
    action?.();
    notification.close();
  });
}

function appendTextWithMentions(container, text) {
  const mentionPattern = /@([\p{L}\p{N}_-]{1,18})/gu;
  let previousIndex = 0;

  for (const match of String(text || "").matchAll(mentionPattern)) {
    container.append(document.createTextNode(text.slice(previousIndex, match.index)));

    const mention = document.createElement("span");
    mention.className =
      normalizeMentionName(match[1]) === normalizeMentionName(currentNickname)
        ? "mention is-me"
        : "mention";
    mention.textContent = match[0];
    container.append(mention);
    previousIndex = match.index + match[0].length;
  }

  container.append(document.createTextNode(text.slice(previousIndex)));
}

function normalizeMentionName(value) {
  return String(value || "").trim().toLocaleLowerCase("fr-FR");
}

function mentionsCurrentUser(text) {
  return [...String(text || "").matchAll(/@([\p{L}\p{N}_-]{1,18})/gu)].some(
    (match) =>
      normalizeMentionName(match[1]) === normalizeMentionName(currentNickname)
  );
}

function renderMessage(message) {
  const row = document.createElement("article");
  row.className = `message ${message.type}`;
  applyGenderClass(row, message.gender);
  row.dataset.messageId = message.id;
  row.dataset.searchText = normalizeMessageSearch(
    [
      message.nickname,
      message.text,
      message.replyToNickname,
      message.replyToText,
    ].join(" ")
  );
  row.dataset.favorite = String(Boolean(message.isFavorite));
  row.classList.toggle("is-pinned", Boolean(message.pinnedAt));
  row.classList.toggle("is-favorite", Boolean(message.isFavorite));

  if (message.type === "system") {
    row.textContent = message.text;
    placeMessageRow(row, message.id);
    return;
  }

  const time = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(message.createdAt);

  const connectedUser = currentUsers.find((user) => user.nickname === message.nickname);
  const authorRole = normalizeDisplayRole(message.role || connectedUser?.role);
  applyRoleClass(row, authorRole);
  row.classList.toggle("from-me", message.nickname === currentNickname);
  row.append(
    createAvatar(
      connectedUser || {
        nickname: message.nickname,
        avatarUrl: "",
        gender: message.gender,
      },
      "message-avatar"
    )
  );

  const content = document.createElement("div");
  content.className = "message-content";
  content.innerHTML = `
    <div class="message-meta">
      <strong>${escapeHtml(message.nickname)}</strong>
      <time>${time}</time>
    </div>
  `;

  if (message.editedAt && !message.deletedAt) {
    const edited = document.createElement("span");
    edited.className = "message-edited";
    edited.textContent = "modifie";
    edited.title = "Ce message a ete modifie";
    content.querySelector(".message-meta").append(edited);
  }

  if (message.pinnedAt && !message.deletedAt) {
    const pinned = document.createElement("span");
    pinned.className = "message-pinned-label";
    pinned.textContent = "epingle";
    pinned.title = `Epingle par ${message.pinnedBy || "la moderation"}`;
    content.querySelector(".message-meta").append(pinned);
  }

  if (message.isFavorite && !message.deletedAt) {
    const favorite = document.createElement("span");
    favorite.className = "message-favorite-label";
    favorite.textContent = "\u2605";
    favorite.title = "Message favori";
    content.querySelector(".message-meta").append(favorite);
  }

  if (message.replyToId && !message.deletedAt) {
    const reference = document.createElement("button");
    reference.type = "button";
    reference.className = "message-reply-reference";

    const referenceAuthor = document.createElement("strong");
    referenceAuthor.textContent = message.replyToNickname || "Message";

    const referenceText = document.createElement("span");
    referenceText.textContent = message.replyToDeleted
      ? "Message supprime"
      : message.replyToText;

    reference.append(referenceAuthor, referenceText);
    reference.addEventListener("click", () => {
      focusReferencedMessage(message.replyToId);
    });
    content.append(reference);
  }

  const paragraph = document.createElement("p");
  if (message.deletedAt) {
    row.classList.add("is-deleted");
    paragraph.textContent = "Message supprime.";
  } else {
    appendTextWithMentions(paragraph, message.text);
  }
  content.append(paragraph);

  if (!message.deletedAt) {
    const reactionBar = createMessageReactions(message);
    if (reactionBar) content.append(reactionBar);
  }

  row.append(content);
  row.classList.toggle(
    "mentions-me",
    !message.deletedAt && mentionsCurrentUser(message.text)
  );

  if (authorRole === "admin" || authorRole === "moderator") {
    const role = document.createElement("span");
    role.className = "message-role";
    role.textContent = authorRole === "admin" ? "admin" : "modo";
    content.querySelector(".message-meta").append(role);
  }

  const actions = document.createElement("div");
  actions.className = "message-actions";

  if (!message.deletedAt) {
    actions.append(
      createMessageActionButton("Repondre", () => {
        setMessageAction("reply", message);
      })
    );
  }

  if (message.canEdit) {
    actions.append(
      createMessageActionButton("Modifier", () => {
        setMessageAction("edit", message);
      })
    );
  }

  if (message.canDelete) {
    actions.append(
      createMessageActionButton(
        "Supprimer",
        () => {
          if (!confirm("Supprimer ce message ?")) return;
          socket.emit(
            "message-action",
            {
              action: "delete",
              id: message.id,
            },
            (response) => {
              if (!response?.ok) {
                alert(response?.error || "Le message n'a pas pu etre supprime.");
              }
            }
          );
        },
        "danger"
      )
    );
  }

  if (message.canFavorite) {
    actions.append(
      createMessageActionButton(
        message.isFavorite ? "Retirer des favoris" : "Favori",
        () => toggleMessageFavorite(message.id),
        message.isFavorite ? "favorite" : ""
      )
    );
  }

  if (message.canPin) {
    actions.append(
      createMessageActionButton(
        message.pinnedAt ? "Desepingler" : "Epingler",
        () => togglePinnedMessage(message),
        message.pinnedAt ? "pinned" : ""
      )
    );
  }

  if (message.canBlock) {
    actions.append(
      createMessageActionButton(
        message.blockedByMe ? "Debloquer" : "Bloquer",
        () =>
          changeBlockedUser(
            message.authorAccountNickname,
            message.nickname,
            !message.blockedByMe
          ),
        message.blockedByMe ? "" : "danger"
      )
    );
  }

  if (currentAccount && message.nickname !== currentNickname && !message.deletedAt) {
    const reportButton = document.createElement("button");
    reportButton.type = "button";
    reportButton.className = "message-report-button";
    reportButton.textContent = "Signaler";
    reportButton.addEventListener("click", () => {
      openReportDialog({
        kind: "public_message",
        targetDisplay: message.nickname,
        messageId: message.id,
      });
    });
    actions.append(reportButton);
  }

  if (actions.childElementCount) content.append(actions);
  placeMessageRow(row, message.id);
}

function createMessageActionButton(label, action, style = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = style ? `message-action-button ${style}` : "message-action-button";
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}

function createMessageReactions(message) {
  const reactions = Array.isArray(message.reactions) ? message.reactions : [];
  if (!reactions.length && !message.canReact) return null;

  const bar = document.createElement("div");
  bar.className = "message-reactions";
  bar.setAttribute("aria-label", "Reactions au message");

  for (const reaction of reactions) {
    const element = document.createElement(message.canReact ? "button" : "span");
    if (message.canReact) {
      element.type = "button";
      element.title = reaction.reactedByMe
        ? "Retirer cette reaction"
        : "Ajouter cette reaction";
      element.addEventListener("click", () => {
        toggleMessageReaction(message.id, reaction.key);
      });
    }
    element.className = reaction.reactedByMe
      ? "message-reaction is-active"
      : "message-reaction";
    element.textContent = `${reaction.emoji} ${reaction.count}`;
    bar.append(element);
  }

  if (message.canReact) {
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "reaction-add-button";
    addButton.textContent = "+";
    addButton.title = "Ajouter une reaction";
    addButton.setAttribute("aria-label", "Ajouter une reaction");
    addButton.setAttribute("aria-expanded", "false");

    const picker = document.createElement("div");
    picker.className = "reaction-picker";
    picker.hidden = true;

    for (const option of REACTION_OPTIONS) {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.textContent = option.emoji;
      optionButton.title = option.label;
      optionButton.setAttribute("aria-label", option.label);
      optionButton.addEventListener("click", () => {
        toggleMessageReaction(message.id, option.key);
      });
      picker.append(optionButton);
    }

    addButton.addEventListener("click", () => {
      picker.hidden = !picker.hidden;
      addButton.setAttribute("aria-expanded", String(!picker.hidden));
    });
    bar.append(addButton, picker);
  }

  return bar;
}

function toggleMessageReaction(messageId, reaction) {
  socket.emit(
    "message-action",
    {
      action: "react",
      id: messageId,
      reaction,
    },
    (response) => {
      if (!response?.ok) {
        alert(response?.error || "La reaction n'a pas pu etre enregistree.");
      }
    }
  );
}

function toggleMessageFavorite(messageId) {
  socket.emit(
    "message-action",
    {
      action: "favorite",
      id: messageId,
    },
    (response) => {
      if (!response?.ok) {
        alert(response?.error || "Le favori n'a pas pu etre enregistre.");
      }
    }
  );
}

function togglePinnedMessage(message) {
  const action = message.pinnedAt ? "unpin" : "pin";
  if (
    action === "pin" &&
    !confirm("Epingler ce message comme annonce du salon ?")
  ) {
    return;
  }
  socket.emit(
    "message-action",
    {
      action,
      id: message.id,
    },
    (response) => {
      if (!response?.ok) {
        alert(response?.error || "L'annonce epinglee n'a pas pu etre modifiee.");
      }
    }
  );
}

function updateTypingState() {
  if (!messageInput.value.trim()) {
    stopTyping();
    return;
  }

  const now = Date.now();
  if (!typingActive || now - lastTypingSignalAt >= 1_000) {
    typingActive = true;
    lastTypingSignalAt = now;
    socket.emit("typing", { active: true });
  }

  window.clearTimeout(typingStopTimer);
  typingStopTimer = window.setTimeout(stopTyping, 3_000);
}

function stopTyping() {
  window.clearTimeout(typingStopTimer);
  typingStopTimer = null;
  if (!typingActive) return;
  typingActive = false;
  lastTypingSignalAt = 0;
  socket.emit("typing", { active: false });
}

function renderTypingIndicator(nicknames) {
  if (!nicknames.length) {
    typingIndicator.textContent = "";
    typingIndicator.classList.remove("is-active");
    return;
  }

  if (nicknames.length === 1) {
    typingIndicator.textContent = `${nicknames[0]} \u00e9crit\u2026`;
  } else if (nicknames.length === 2) {
    typingIndicator.textContent = `${nicknames[0]} et ${nicknames[1]} \u00e9crivent\u2026`;
  } else {
    typingIndicator.textContent =
      `${nicknames[0]}, ${nicknames[1]} et ${nicknames.length - 2} autres ` +
      "\u00e9crivent\u2026";
  }
  typingIndicator.classList.add("is-active");
}

function placeMessageRow(row, messageId) {
  const existing = [...messages.children].find(
    (child) => child.dataset.messageId === messageId
  );
  if (existing) {
    existing.replaceWith(row);
  } else {
    messages.append(row);
  }
}

function renderPinnedMessage() {
  const pinnedMessage = [...currentRoomMessages.values()]
    .filter((message) => message.pinnedAt && !message.deletedAt)
    .sort((first, second) => Number(second.pinnedAt) - Number(first.pinnedAt))[0];

  if (!pinnedMessage) {
    pinnedMessageBanner.classList.add("hidden");
    pinnedMessageAuthor.textContent = "Annonce epinglee";
    pinnedMessageText.textContent = "";
    return;
  }

  pinnedMessageAuthor.textContent = `${pinnedMessage.nickname} - annonce epinglee`;
  pinnedMessageText.textContent =
    pinnedMessage.text.length > 180
      ? `${pinnedMessage.text.slice(0, 177)}...`
      : pinnedMessage.text;
  pinnedMessageBanner.classList.remove("hidden");
}

function setMessageAction(mode, message) {
  if (message.deletedAt) return;
  if (activeMessageAction?.mode === "edit" && mode !== "edit") {
    messageInput.value = "";
  }
  activeMessageAction = {
    mode,
    id: message.id,
    nickname: message.nickname,
    text: message.text,
  };

  composerContextTitle.textContent =
    mode === "edit"
      ? "Modification de votre message"
      : `Reponse a ${message.nickname}`;
  composerContextText.textContent = message.text;
  composerContext.classList.remove("hidden");
  messageInput.placeholder =
    mode === "edit" ? "Modifie ton message..." : "Ecris ta reponse...";

  if (mode === "edit") {
    messageInput.value = message.text;
  }
  messageInput.focus();
}

function clearMessageAction() {
  const wasEditing = activeMessageAction?.mode === "edit";
  activeMessageAction = null;
  composerContext.classList.add("hidden");
  composerContextTitle.textContent = "Reponse";
  composerContextText.textContent = "";
  messageInput.placeholder = "Ecris un message...";
  if (wasEditing) messageInput.value = "";
}

function focusReferencedMessage(messageId) {
  const target = [...messages.children].find(
    (child) => child.dataset.messageId === messageId
  );
  if (!target) return;

  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.add("is-focused");
  window.setTimeout(() => target.classList.remove("is-focused"), 1400);
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
