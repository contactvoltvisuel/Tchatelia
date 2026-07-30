import "./config.js";
import express from "express";
import { createServer } from "node:http";
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
  scrypt as scryptCallback,
} from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import {
  banNickname,
  clearAccountEmailTokens,
  clearTemporaryMute,
  createContactMessage,
  createAccount,
  createAccountSession,
  createEmailVerificationToken,
  createPasswordResetToken,
  createReport,
  createRoom,
  deleteAccount,
  deleteAccountSession,
  deleteAccountSessions,
  deleteMessageContent,
  deleteRoom,
  getAccountByNickname,
  getAccountByEmail,
  getAccountSession,
  getActiveTemporaryMute,
  getContactMessageById,
  getDatabaseLabel,
  getMessageById,
  getPrivateBlockState,
  getPrivateConversation,
  getPrivateMessageById,
  getEmailVerificationToken,
  getPasswordResetToken,
  getReportById,
  getRoomHistory,
  getRooms,
  initDatabase,
  isBanned,
  hasOpenReport,
  listAccounts,
  listContactMessages,
  listModerationLogs,
  listFavoriteMessageIds,
  listPrivateBlocks,
  listPrivateMessagesForAccount,
  listReports,
  listSecurityEvents,
  markPrivateMessagesRead,
  markEmailVerificationTokenUsed,
  markPasswordResetTokenUsed,
  savePrivateMessage,
  saveMessage,
  saveModerationLog,
  saveSecurityEvent,
  saveTemporaryMute,
  setAccountActive,
  setAccountEmailVerified,
  setPrivateBlock,
  setMessageFavorite,
  setPinnedMessage,
  trimRoomHistory,
  touchAccountSession,
  unbanNickname,
  updateAccountPassword,
  updateAccountProfile,
  updateAccountSettings,
  updateAccountRole,
  updateContactMessageStatus,
  updateMessageReactions,
  updateMessageText,
  updateRoomTopic,
  updateReportStatus,
} from "./db.js";
import {
  getMessageAuthorAccountNickname,
  shouldHideAccountContentFromUser,
  shouldHideMessageFromUser,
} from "./blocking.js";
import {
  getForwardedClientIp,
  getNewPasswordError,
  isAllowedOrigin,
  isIpAddressAllowed,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  parseAllowedIpAddresses,
} from "./security.js";
import {
  findBlockedTerm,
  formatModerationDuration,
  getAutomaticMuteDuration,
  parseModerationTerms,
} from "./auto-moderation.js";

const scrypt = promisify(scryptCallback);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  maxHttpBufferSize: 512 * 1024,
  allowRequest: (request, callback) => {
    callback(null, isRequestOriginAllowed(request));
  },
});
const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "public");
const publicIndex = join(publicDir, "index.html");
const rootIndex = join(__dirname, "index.html");

const PORT = process.env.PORT || 3000;
const MAX_HISTORY = 80;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "tchatelia-admin";
const ADMIN_ALLOWED_IPS = parseAllowedIpAddresses(process.env.ADMIN_ALLOWED_IPS);
const ADMIN_IP_PROTECTION_ENABLED = ADMIN_ALLOWED_IPS.length > 0;
const SPAM_WINDOW_MS = 10_000;
const SPAM_MAX_MESSAGES = 5;
const SPAM_COOLDOWN_MS = 15_000;
const DUPLICATE_COOLDOWN_MS = 8_000;
const MODERATION_ROLES = new Set(["admin", "moderator"]);
const MESSAGE_REACTIONS = new Map([
  ["like", "\u{1F44D}"],
  ["heart", "\u{2764}\u{FE0F}"],
  ["laugh", "\u{1F602}"],
  ["surprised", "\u{1F62E}"],
]);
const PRESENCE_STATUSES = new Set(["online", "away", "busy"]);
const ACCOUNT_GENDERS = new Set(["man", "woman", "other"]);
const PUBLIC_PROTECTION_ENABLED = process.env.PUBLIC_PROTECTION !== "false";
const TURNSTILE_SITE_KEY = String(process.env.TURNSTILE_SITE_KEY || "").trim();
const TURNSTILE_SECRET_KEY = String(process.env.TURNSTILE_SECRET_KEY || "").trim();
const TURNSTILE_ENABLED = Boolean(TURNSTILE_SITE_KEY && TURNSTILE_SECRET_KEY);
const BREVO_API_KEY = String(process.env.BREVO_API_KEY || "").trim();
const MAIL_FROM_EMAIL = normalizeEmail(process.env.MAIL_FROM_EMAIL);
const MAIL_FROM_NAME = String(process.env.MAIL_FROM_NAME || "Tchatelia").trim().slice(0, 70);
const MODERATION_ALERT_EMAIL =
  normalizeEmail(process.env.MODERATION_ALERT_EMAIL) || MAIL_FROM_EMAIL;
const PUBLIC_URL = String(process.env.PUBLIC_URL || "").trim().replace(/\/+$/, "");
const PASSWORD_RESET_ENABLED = Boolean(
  BREVO_API_KEY && isValidEmail(MAIL_FROM_EMAIL)
);
const EMAIL_VERIFICATION_ENABLED = PASSWORD_RESET_ENABLED;
const AUTOMATIC_MODERATION_ENABLED = process.env.AUTO_MODERATION !== "false";
const AUTOMATIC_MODERATION_TERMS = parseModerationTerms(
  process.env.AUTO_MODERATION_TERMS
);
const MODERATION_ALERT_EMAIL_ENABLED = Boolean(
  BREVO_API_KEY &&
    isValidEmail(MAIL_FROM_EMAIL) &&
    isValidEmail(MODERATION_ALERT_EMAIL)
);
const AUTOMATIC_VIOLATION_WINDOW_MS = 30 * 60_000;
const MODERATION_ALERT_COOLDOWN_MS = 10 * 60_000;
const MODERATION_ALERT_WINDOW_MS = 60 * 60_000;
const MAX_MODERATION_ALERTS_PER_WINDOW = 6;
const PASSWORD_RESET_TTL_MS = 30 * 60_000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60_000;
const ACCOUNT_SESSION_TTL_MS = 30 * 24 * 60 * 60_000;
const ACCOUNT_SESSION_COOKIE = "tchatelia_session";
const ACCOUNT_SESSION_SECURE =
  /^https:\/\//i.test(PUBLIC_URL) || process.env.NODE_ENV === "production";
const PASSWORD_RESET_WINDOW_MS = 60 * 60_000;
const MAX_PASSWORD_RESET_REQUESTS = 3;
const MAX_EMAIL_VERIFICATION_REQUESTS = 3;
const SECURITY_HASH_SECRET =
  process.env.SECURITY_HASH_SECRET || ADMIN_PASSWORD || "tchatelia-security";
const AUTH_WINDOW_MS = 10 * 60_000;
const MAX_AUTH_ATTEMPTS = 20;
const MAX_AUTH_FAILURES = 5;
const AUTH_LOCK_MS = 15 * 60_000;
const REGISTRATION_WINDOW_MS = 60 * 60_000;
const MAX_REGISTRATIONS = 3;
const MAX_CONNECTIONS_PER_IDENTITY = 8;
const contactRateLimits = new Map();
const protectionStates = new Map();
const passwordResetRateLimits = new Map();
const emailVerificationRateLimits = new Map();
const automaticModerationStates = new Map();
const moderationAlertRateLimits = new Map();
let moderationAlertHistory = [];

await initDatabase();

const rooms = new Map(
  await Promise.all(
    (await getRooms()).map(async (room) => [
      room.name,
      {
        topic: room.topic,
        history: limitRoomHistory(
          await getRoomHistory(room.name, MAX_HISTORY),
          MAX_HISTORY
        ),
      },
    ])
  )
);

const users = new Map();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((request, response, next) => {
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self' wss: https://challenges.cloudflare.com",
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src https://challenges.cloudflare.com",
    "img-src 'self' data: blob: https: http:",
    "manifest-src 'self'",
    "object-src 'none'",
    "script-src 'self' https://challenges.cloudflare.com",
    "style-src 'self'",
  ].join("; ");

  response.setHeader("Content-Security-Policy", contentSecurityPolicy);
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  response.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=(), usb=()");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");

  const forwardedProtocol = String(
    request.headers["x-forwarded-proto"] || ""
  )
    .split(",")[0]
    .trim();
  if (request.secure || forwardedProtocol === "https") {
    response.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }
  next();
});
app.use((request, response, next) => {
  const changesState = ["POST", "PUT", "PATCH", "DELETE"].includes(
    request.method
  );
  if (changesState && !isRequestOriginAllowed(request)) {
    response.status(403).json({
      ok: false,
      error: "Cette requete n'est pas autorisee.",
    });
    return;
  }
  next();
});
app.use(express.json({ limit: "20kb" }));
app.use((error, request, response, next) => {
  if (error?.type === "entity.too.large") {
    response.status(413).json({ ok: false, error: "Requete trop volumineuse." });
    return;
  }
  if (error instanceof SyntaxError && "body" in error) {
    response.status(400).json({ ok: false, error: "Requete invalide." });
    return;
  }
  next(error);
});
app.use((request, response, next) => {
  if (
    request.path === "/" ||
    /\.(?:html|js|css)$/i.test(request.path)
  ) {
    response.setHeader("Cache-Control", "no-store");
  }
  next();
});
app.use(express.static(publicDir));
app.use(express.static(__dirname));

app.get("/", (request, response) => {
  response.sendFile(existsSync(publicIndex) ? publicIndex : rootIndex);
});

app.get("/health", (request, response) => {
  response.set("Cache-Control", "no-store").json({
    ok: true,
    service: "tchatelia",
    protection: PUBLIC_PROTECTION_ENABLED,
  });
});

app.get("/api/public-config", (request, response) => {
  response.set("Cache-Control", "no-store").json({
    publicProtection: PUBLIC_PROTECTION_ENABLED,
    turnstileEnabled: TURNSTILE_ENABLED,
    turnstileSiteKey: TURNSTILE_ENABLED ? TURNSTILE_SITE_KEY : "",
    passwordResetEnabled: PASSWORD_RESET_ENABLED,
    emailVerificationEnabled: EMAIL_VERIFICATION_ENABLED,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    maxPasswordLength: MAX_PASSWORD_LENGTH,
    adminAccessAllowed: isAdminAccessAllowed(request),
    adminIpProtectionEnabled: ADMIN_IP_PROTECTION_ENABLED,
    rooms: getRoomList(),
  });
});

app.get("/api/session", async (request, response) => {
  response.set("Cache-Control", "no-store");
  try {
    const sessionState = await getSessionAccountFromHeaders(request.headers);
    if (!sessionState) {
      clearSessionCookie(request, response);
      response.status(401).json({ ok: false });
      return;
    }
    if (sessionState.account.role === "admin" && !isAdminAccessAllowed(request)) {
      const identity = getSecurityIdentity(request);
      await recordSecurityEvent(
        "admin_ip_denied",
        identity.hash,
        `Session admin refusee pour ${sessionState.account.nickname}`
      );
      clearSessionCookie(request, response);
      response.status(403).json({
        ok: false,
        error: "Cette session administrateur n'est pas autorisee depuis cette connexion.",
      });
      return;
    }
    response.json({
      ok: true,
      account: {
        nickname: sessionState.account.nickname,
        displayName: sessionState.account.displayName,
      },
    });
  } catch (error) {
    console.error("Erreur lecture de session:", error.message);
    clearSessionCookie(request, response);
    response.status(401).json({ ok: false });
  }
});

app.post("/api/session", async (request, response) => {
  response.set("Cache-Control", "no-store");
  const cleanNickname = cleanName(request.body?.nickname);
  const password = String(request.body?.password || "");
  const identity = getSecurityIdentity(request);

  try {
    const protectionCheck = await checkJoinProtection(identity, "login", cleanNickname);
    if (!protectionCheck.ok) {
      response.status(429).json({
        ok: false,
        error: protectionCheck.error,
        protected: true,
      });
      return;
    }

    if (
      TURNSTILE_ENABLED &&
      !(await verifyTurnstileToken(request.body?.turnstileToken, identity.rawIp))
    ) {
      await recordSecurityEvent(
        "captcha_failure",
        identity.hash,
        `Verification refusee pour ${cleanNickname}`
      );
      response.status(400).json({
        ok: false,
        error: "La verification anti-robot a echoue. Reessaie.",
        protected: true,
        resetCaptcha: true,
      });
      return;
    }

    const account = await findAccountByIdentity(cleanNickname);
    let passwordValid = false;
    if (account && password.length <= MAX_PASSWORD_LENGTH) {
      passwordValid = await verifyPassword(password, account);
    } else {
      await consumePasswordVerificationTime(password);
    }
    if (!account || !passwordValid) {
      await registerAuthFailure(
        identity.hash,
        account ? "account_password_failure" : "unknown_account",
        cleanNickname
      );
      response.status(401).json({
        ok: false,
        error: "Pseudo ou mot de passe incorrect.",
      });
      return;
    }

    if (!account.active) {
      response.status(403).json({ ok: false, error: "Ce compte est desactive." });
      return;
    }

    if (account.role === "admin" && !isAdminAccessAllowed(request)) {
      await recordSecurityEvent(
        "admin_ip_denied",
        identity.hash,
        `Connexion au compte admin refusee pour ${account.nickname}`
      );
      response.status(403).json({
        ok: false,
        error: "Ce compte administrateur est accessible uniquement depuis ton reseau reconnu.",
      });
      return;
    }

    if (EMAIL_VERIFICATION_ENABLED && !account.emailVerified) {
      response.status(403).json({
        ok: false,
        verificationRequired: true,
        email: account.email,
        message: "Verifie ton adresse e-mail avant de te connecter.",
      });
      return;
    }

    if (
      (await isBanned(account.nickname)) ||
      (await isBanned(normalizeName(account.displayName)))
    ) {
      response.status(403).json({
        ok: false,
        error: "Ce compte est banni du chat.",
      });
      return;
    }

    const rawToken = randomBytes(32).toString("hex");
    const createdAt = Date.now();
    await createAccountSession({
      tokenHash: hashResetToken(rawToken),
      accountNickname: account.nickname,
      expiresAt: createdAt + ACCOUNT_SESSION_TTL_MS,
      createdAt,
    });
    setSessionCookie(request, response, rawToken);
    registerSuccessfulAccess(identity.hash, "login");
    response.json({
      ok: true,
      account: {
        nickname: account.nickname,
        displayName: account.displayName,
      },
    });
  } catch (error) {
    console.error("Erreur creation de session:", error.message);
    response.status(500).json({
      ok: false,
      error: "La connexion n'a pas pu etre terminee. Reessaie plus tard.",
    });
  }
});

app.delete("/api/session", async (request, response) => {
  response.set("Cache-Control", "no-store");
  try {
    const rawToken = getSessionTokenFromHeaders(request.headers);
    if (rawToken) await deleteAccountSession(hashResetToken(rawToken));
  } catch (error) {
    console.error("Erreur suppression de session:", error.message);
  }
  clearSessionCookie(request, response);
  response.json({ ok: true });
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

app.post("/api/contact", async (request, response) => {
  const now = Date.now();
  const body = request.body || {};
  const clientKey = request.ip || "unknown";
  const previousContact = contactRateLimits.get(clientKey) || 0;

  if (now - previousContact < 60_000) {
    response.status(429).json({
      ok: false,
      error: "Attends une minute avant d'envoyer un nouveau message.",
    });
    return;
  }

  if (String(body.website || "").trim()) {
    response.status(201).json({ ok: true });
    return;
  }

  const name = String(body.name || "").trim().slice(0, 80);
  const email = String(body.email || "").trim().toLocaleLowerCase("fr-FR").slice(0, 150);
  const subject = ["general", "account", "moderation", "privacy", "other"].includes(
    body.subject
  )
    ? body.subject
    : "other";
  const message = String(body.message || "").trim().slice(0, 2000);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (name.length < 2 || !validEmail || message.length < 20 || body.accepted !== true) {
    response.status(400).json({
      ok: false,
      error: "Verifie ton nom, ton e-mail, ton message et l'acceptation de la politique.",
    });
    return;
  }

  try {
    await createContactMessage({
      id: crypto.randomUUID(),
      name,
      email,
      subject,
      message,
      createdAt: now,
    });
    contactRateLimits.set(clientKey, now);

    if (contactRateLimits.size > 1000) {
      for (const [key, sentAt] of contactRateLimits.entries()) {
        if (now - sentAt > 60_000) contactRateLimits.delete(key);
      }
    }

    await publishContactMessages();
    response.status(201).json({ ok: true });
  } catch (error) {
    console.error("Erreur formulaire de contact:", error);
    response.status(500).json({
      ok: false,
      error: "Le message n'a pas pu etre envoye. Reessaie plus tard.",
    });
  }
});

io.on("connection", (socket) => {
  socket.on("email-verification-request", async (payload = {}, callback) => {
    if (!EMAIL_VERIFICATION_ENABLED) {
      callback?.({
        ok: false,
        error: "La verification par e-mail n'est pas encore configuree.",
      });
      return;
    }

    const identity = getSecurityIdentity(socket);
    if (!canRequestEmailVerification(identity.hash)) {
      callback?.({
        ok: false,
        error: "Trop de demandes. Reessaie dans une heure.",
      });
      return;
    }

    const email = normalizeEmail(payload.email);
    if (!isValidEmail(email)) {
      callback?.({ ok: false, error: "Saisis une adresse e-mail valide." });
      return;
    }

    const genericResponse = {
      ok: true,
      message: "Si cette adresse doit etre verifiee, un nouvel e-mail vient d'etre envoye.",
    };

    try {
      const account = await getAccountByEmail(email);
      if (account && !account.emailVerified) {
        await issueEmailVerification(account, socket);
      }
      callback?.(genericResponse);
    } catch (error) {
      console.error("Erreur verification de l'e-mail:", error.message);
      callback?.(genericResponse);
    }
  });

  socket.on("email-verification-confirm", async (payload = {}, callback) => {
    const token = String(payload.token || "").trim();
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      callback?.({ ok: false, error: "Ce lien de verification est invalide." });
      return;
    }

    try {
      const tokenRecord = await getEmailVerificationToken(hashResetToken(token));
      if (
        !tokenRecord ||
        tokenRecord.usedAt ||
        Number(tokenRecord.expiresAt) < Date.now()
      ) {
        callback?.({
          ok: false,
          error: "Ce lien est expire ou a deja ete utilise.",
        });
        return;
      }

      const account = await getAccountByNickname(tokenRecord.accountNickname);
      if (!account || normalizeEmail(account.email) !== normalizeEmail(tokenRecord.email)) {
        callback?.({
          ok: false,
          error: "Cette adresse n'est plus associee au compte.",
        });
        return;
      }

      await setAccountEmailVerified(account.nickname, true);
      await markEmailVerificationTokenUsed(tokenRecord.tokenHash, Date.now());
      emitToAccount(account.nickname, "email-verified", { email: account.email });
      callback?.({
        ok: true,
        message: "Adresse e-mail verifiee. Tu peux maintenant te connecter.",
      });
    } catch (error) {
      console.error("Erreur confirmation de l'e-mail:", error.message);
      callback?.({
        ok: false,
        error: "L'adresse n'a pas pu etre verifiee. Reessaie plus tard.",
      });
    }
  });

  socket.on("password-reset-request", async (payload = {}, callback) => {
    if (!PASSWORD_RESET_ENABLED) {
      callback?.({
        ok: false,
        error: "La recuperation par e-mail n'est pas encore configuree.",
      });
      return;
    }

    const identity = getSecurityIdentity(socket);
    if (!canRequestPasswordReset(identity.hash)) {
      callback?.({
        ok: false,
        error: "Trop de demandes. Reessaie dans une heure.",
      });
      return;
    }

    const email = normalizeEmail(payload.email);
    if (!isValidEmail(email)) {
      callback?.({ ok: false, error: "Saisis une adresse e-mail valide." });
      return;
    }

    const genericResponse = {
      ok: true,
      message: "Si cette adresse correspond a un compte, un e-mail vient d'etre envoye.",
    };

    try {
      const account = await getAccountByEmail(email);
      if (account?.emailVerified) {
        const rawToken = randomBytes(32).toString("hex");
        const createdAt = Date.now();
        await createPasswordResetToken({
          tokenHash: hashResetToken(rawToken),
          accountNickname: account.nickname,
          expiresAt: createdAt + PASSWORD_RESET_TTL_MS,
          createdAt,
        });
        await sendPasswordResetEmail(
          account,
          buildPasswordResetUrl(socket, rawToken)
        );
      }
      callback?.(genericResponse);
    } catch (error) {
      console.error("Erreur recuperation du mot de passe:", error.message);
      callback?.(genericResponse);
    }
  });

  socket.on("password-reset-confirm", async (payload = {}, callback) => {
    const token = String(payload.token || "").trim();
    const newPassword = String(payload.newPassword || "");
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      callback?.({ ok: false, error: "Ce lien de recuperation est invalide." });
      return;
    }
    const basicPasswordError = getNewPasswordError(newPassword);
    if (basicPasswordError) {
      callback?.({
        ok: false,
        error: basicPasswordError,
      });
      return;
    }

    try {
      const tokenRecord = await getPasswordResetToken(hashResetToken(token));
      if (
        !tokenRecord ||
        tokenRecord.usedAt ||
        Number(tokenRecord.expiresAt) < Date.now()
      ) {
        callback?.({
          ok: false,
          error: "Ce lien est expire ou a deja ete utilise.",
        });
        return;
      }

      const account = await getAccountByNickname(tokenRecord.accountNickname);
      const passwordError = getNewPasswordError(newPassword, [
        account?.nickname,
        account?.displayName,
        normalizeEmail(account?.email).split("@")[0],
      ]);
      if (passwordError) {
        callback?.({ ok: false, error: passwordError });
        return;
      }

      await updateAccountPassword(
        tokenRecord.accountNickname,
        await hashPassword(newPassword)
      );
      await revokeAccountSessions(
        tokenRecord.accountNickname,
        "Ton mot de passe a change. Reconnecte-toi."
      );
      await markPasswordResetTokenUsed(tokenRecord.tokenHash, Date.now());
      callback?.({
        ok: true,
        message: "Mot de passe modifie. Tu peux maintenant te connecter.",
      });
    } catch (error) {
      console.error("Erreur nouveau mot de passe:", error.message);
      callback?.({
        ok: false,
        error: "Le mot de passe n'a pas pu etre modifie. Reessaie plus tard.",
      });
    }
  });

  socket.on("join", async (
    {
      nickname,
      room,
      adminPassword,
      accountPassword,
      accountEmail,
      accountGender,
      authMode,
      legalAccepted,
      turnstileToken,
    },
    callback
  ) => {
    let cleanNickname = cleanName(nickname);
    let normalizedNickname = normalizeName(cleanNickname);
    const cleanRoom = rooms.has(room) ? room : "accueil";
    const wantsAdmin = Boolean(String(adminPassword || "").trim());
    const cleanAuthMode = ["guest", "login", "register", "session"].includes(authMode)
      ? authMode
      : "guest";
    const cleanAccountPassword = String(accountPassword || "");
    const cleanAccountEmail = normalizeEmail(accountEmail);
    const securityIdentity = getSecurityIdentity(socket);
    const adminIpAllowed = isIpAddressAllowed(
      securityIdentity.rawIp,
      ADMIN_ALLOWED_IPS
    );
    const isAdmin =
      adminIpAllowed && secureSecretEqual(adminPassword, ADMIN_PASSWORD);
    const cleanGender = normalizeGender(accountGender);
    let registeredNow = false;
    let sessionAccount = null;

    if (legalAccepted !== true) {
      callback?.({
        ok: false,
        error: "Tu dois confirmer ton age et accepter les textes du site.",
      });
      return;
    }

    if (cleanAuthMode === "session") {
      try {
        const sessionState = await getSessionAccountFromHeaders(socket.handshake.headers);
        if (!sessionState) {
          callback?.({
            ok: false,
            sessionExpired: true,
            error: "Ta session a expire. Connecte-toi de nouveau.",
          });
          return;
        }
        sessionAccount = sessionState.account;
        cleanNickname = sessionAccount.displayName;
        normalizedNickname = sessionAccount.nickname;
      } catch (error) {
        console.error("Erreur connexion automatique:", error.message);
        callback?.({
          ok: false,
          sessionExpired: true,
          error: "La connexion automatique a echoue.",
        });
        return;
      }
    }

    const protectionCheck = await checkJoinProtection(
      securityIdentity,
      cleanAuthMode,
      cleanNickname
    );
    if (!protectionCheck.ok) {
      callback?.({
        ok: false,
        error: protectionCheck.error,
        protected: true,
      });
      return;
    }

    if (
      TURNSTILE_ENABLED &&
      cleanAuthMode !== "session" &&
      !(await verifyTurnstileToken(turnstileToken, securityIdentity.rawIp))
    ) {
      await recordSecurityEvent(
        "captcha_failure",
        securityIdentity.hash,
        `Verification refusee pour ${cleanNickname}`
      );
      callback?.({
        ok: false,
        error: "La verification anti-robot a echoue. Reessaie.",
        protected: true,
        resetCaptcha: true,
      });
      return;
    }

    if (wantsAdmin && !adminIpAllowed) {
      await recordSecurityEvent(
        "admin_ip_denied",
        securityIdentity.hash,
        `Acces admin refuse pour ${cleanNickname}`
      );
      callback?.({
        ok: false,
        error: "L'acces administrateur n'est pas autorise depuis cette connexion.",
      });
      return;
    }

    if (wantsAdmin && !isAdmin) {
      await registerAuthFailure(
        securityIdentity.hash,
        "admin_password_failure",
        cleanNickname
      );
      callback?.({
        ok: false,
        error: "Mot de passe admin incorrect.",
      });
      return;
    }

    if (cleanAuthMode === "register") {
      const passwordError = getNewPasswordError(cleanAccountPassword, [
        cleanNickname,
        cleanAccountEmail.split("@")[0],
      ]);
      if (passwordError) {
        callback?.({
          ok: false,
          error: passwordError,
        });
        return;
      }

      if (!isValidEmail(cleanAccountEmail)) {
        callback?.({
          ok: false,
          error: "Une adresse e-mail valide est necessaire pour recuperer le compte.",
        });
        return;
      }

      const existingAccount = await findAccountByIdentity(cleanNickname);
      if (existingAccount) {
        callback?.({
          ok: false,
          error: "Ce pseudo est deja reserve. Connecte-toi avec le mot de passe du compte.",
        });
        return;
      }

      if (await getAccountByEmail(cleanAccountEmail)) {
        callback?.({
          ok: false,
          error: "Cette adresse e-mail est deja associee a un compte.",
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
        gender: cleanGender,
        email: cleanAccountEmail,
        emailVerified: !EMAIL_VERIFICATION_ENABLED,
      });
      registeredNow = true;
    }

    const account = sessionAccount || (await findAccountByIdentity(cleanNickname));
    const accountNickname = account?.nickname || normalizedNickname;

    if (account && cleanAuthMode !== "register") {
      if (!account.active) {
        callback?.({
          ok: false,
          error: "Ce compte est desactive.",
        });
        return;
      }

      if (cleanAuthMode !== "login" && cleanAuthMode !== "session") {
        callback?.({
          ok: false,
          error: "Ce pseudo est reserve. Utilise la connexion compte.",
        });
        return;
      }

      if (cleanAuthMode === "login") {
        let passwordValid = false;
        if (cleanAccountPassword.length <= MAX_PASSWORD_LENGTH) {
          passwordValid = await verifyPassword(cleanAccountPassword, account);
        } else {
          await consumePasswordVerificationTime(cleanAccountPassword);
        }
        if (!passwordValid) {
          await registerAuthFailure(
            securityIdentity.hash,
            "account_password_failure",
            cleanNickname
          );
          callback?.({
            ok: false,
            error: "Pseudo ou mot de passe incorrect.",
          });
          return;
        }
      }

      if (account.role === "admin" && !adminIpAllowed) {
        await recordSecurityEvent(
          "admin_ip_denied",
          securityIdentity.hash,
          `Connexion au compte admin refusee pour ${cleanNickname}`
        );
        callback?.({
          ok: false,
          error: "Ce compte administrateur est accessible uniquement depuis ton reseau reconnu.",
        });
        return;
      }
    }

    if (!account && (cleanAuthMode === "login" || cleanAuthMode === "session")) {
      if (cleanAuthMode === "login") {
        await consumePasswordVerificationTime(cleanAccountPassword);
      }
      await registerAuthFailure(
        securityIdentity.hash,
        "unknown_account",
        cleanNickname
      );
      callback?.({
        ok: false,
        error: "Pseudo ou mot de passe incorrect.",
      });
      return;
    }

    if (account && EMAIL_VERIFICATION_ENABLED && !account.emailVerified) {
      let verificationMessage =
        "Verifie ton adresse e-mail avant de te connecter.";
      if (registeredNow) {
        registerSuccessfulAccess(securityIdentity.hash, cleanAuthMode);
        try {
          await issueEmailVerification(account, socket);
          verificationMessage =
            "Ton compte est cree. Consulte ton e-mail pour confirmer ton adresse.";
        } catch (error) {
          console.error("Erreur e-mail apres inscription:", error.message);
          verificationMessage =
            "Ton compte est cree, mais l'e-mail n'a pas pu etre envoye. Utilise le bouton Renvoyer.";
        }
      }
      callback?.({
        ok: false,
        verificationRequired: true,
        email: account.email,
        message: verificationMessage,
      });
      return;
    }

    registerSuccessfulAccess(securityIdentity.hash, cleanAuthMode);
    const role = account?.role || (isAdmin ? "admin" : "user");
    const displayName = account?.displayName || cleanNickname;
    const gender = normalizeGender(account?.gender || cleanGender);
    const [favoriteMessageIds, blockedUsers] =
      account || cleanAuthMode === "register"
        ? await Promise.all([
            listFavoriteMessageIds(accountNickname),
            listPrivateBlocks(accountNickname),
          ])
        : [[], []];
    const moderationSubjectKey =
      account || cleanAuthMode === "register"
        ? `account:${accountNickname}`
        : `guest:${securityIdentity.hash}:${normalizedNickname}`;
    const activeMute = MODERATION_ROLES.has(role)
      ? null
      : await getActiveTemporaryMute(moderationSubjectKey);

    if (
      (await isBanned(normalizedNickname)) ||
      (account && account.nickname !== normalizedNickname && (await isBanned(account.nickname)))
    ) {
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
      gender,
      account: Boolean(account || cleanAuthMode === "register"),
      accountNickname: account || cleanAuthMode === "register" ? accountNickname : null,
      bio: account?.bio || "",
      avatarUrl: account?.avatarUrl || "",
      privateMessagesEnabled: account
        ? Boolean(account.privateMessagesEnabled)
        : true,
      messageAuthorId:
        account || cleanAuthMode === "register"
          ? `account:${accountNickname}`
          : `guest:${randomUUID()}`,
      securityIdentityHash: securityIdentity.hash,
      moderationSubjectKey,
      adminIpAllowed,
      memberSince: account?.createdAt || Date.now(),
      messageTimes: [],
      lastMessage: "",
      cooldownUntil: 0,
      mutedUntil: Number(activeMute?.expiresAt) || 0,
      muteReason: activeMute?.reason || "",
      lastReportAt: 0,
      lastReactionAt: 0,
      favoriteMessageIds: new Set(favoriteMessageIds),
      blockedAccountNicknames: new Set(
        blockedUsers.map((blockedUser) => blockedUser.blocked)
      ),
      presenceStatus: "online",
      isTyping: false,
      typingTimeout: null,
      joinedAt: Date.now(),
    });

    socket.join(cleanRoom);
    socket.emit("rooms", getRoomList());
    sendRoomHistory(socket, users.get(socket.id), cleanRoom);
    await sendSystem(cleanRoom, `${displayName}${formatRoleSuffix(role)} vient d'entrer dans le salon.`);
    publishUsers(cleanRoom);
    if (role === "admin") {
      await sendAccountList(socket);
      await sendModerationLogs(socket);
      await sendContactMessages(socket);
      await sendSecurityEvents(socket);
    }
    if (MODERATION_ROLES.has(role)) {
      await sendReports(socket);
    }
    if (account || cleanAuthMode === "register") {
      await sendPrivateState(socket, accountNickname);
    }

    callback?.({
      ok: true,
      nickname: displayName,
      room: cleanRoom,
      role,
      gender,
      account: Boolean(account || cleanAuthMode === "register"),
      accountNickname: account || cleanAuthMode === "register" ? accountNickname : "",
      topic: rooms.get(cleanRoom).topic,
      mutedUntil: Number(activeMute?.expiresAt) || 0,
    });
    if (activeMute) {
      emitPrivateSystem(
        socket,
        buildActiveMuteMessage(activeMute.expiresAt, activeMute.reason)
      );
    }
    publishTyping(cleanRoom);
  });

  socket.on("switch-room", async (room, callback) => {
    const user = users.get(socket.id);
    if (!user) return;

    const nextRoom = rooms.has(room) ? room : "accueil";
    if (nextRoom === user.room) return;

    const previousRoom = user.room;
    clearUserTyping(user);
    socket.leave(previousRoom);
    await sendSystem(previousRoom, `${user.nickname} a quitte le salon.`);
    publishUsers(previousRoom);

    user.room = nextRoom;
    socket.join(nextRoom);
    sendRoomHistory(socket, user, nextRoom);
    await sendSystem(nextRoom, `${user.nickname} vient d'entrer dans le salon.`);
    publishUsers(nextRoom);

    callback?.({
      ok: true,
      room: nextRoom,
      topic: rooms.get(nextRoom).topic,
    });
    publishTyping(nextRoom);
  });

  socket.on("typing", (payload = {}) => {
    const user = users.get(socket.id);
    if (!user) return;
    if (!MODERATION_ROLES.has(user.role) && user.mutedUntil > Date.now()) {
      clearUserTyping(user);
      return;
    }

    const active =
      typeof payload === "boolean" ? payload : Boolean(payload.active);
    setUserTyping(user, active);
  });

  socket.on("presence-status", (payload = {}, callback) => {
    const user = users.get(socket.id);
    if (!user) return;

    const status = String(payload.status || "");
    if (!PRESENCE_STATUSES.has(status)) {
      callback?.({ ok: false, error: "Ce statut n'est pas disponible." });
      return;
    }

    user.presenceStatus = status;
    publishUsers(user.room);
    callback?.({ ok: true, status });
  });

  socket.on("message", async (payload) => {
    const user = users.get(socket.id);
    if (!user) return;

    const rawText =
      payload && typeof payload === "object" ? payload.text : payload;
    const replyToId =
      payload && typeof payload === "object"
        ? String(payload.replyToId || "").trim()
        : "";
    const messageText = String(rawText || "").trim().slice(0, 500);
    if (!messageText) return;
    clearUserTyping(user);

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
            ? "Commandes admin : /me texte, /clear, /kick pseudo, /ban pseudo, /unban pseudo, /unmute pseudo"
            : user.role === "moderator"
              ? "Commandes moderation : /me texte, /clear, /kick pseudo, /ban pseudo, /unban pseudo, /unmute pseudo"
            : user.adminIpAllowed
              ? "Commandes : /me texte, /clear, /admin motdepasse"
              : "Commandes : /me texte, /clear",
        createdAt: Date.now(),
      });
      return;
    }

    if (messageText.startsWith("/admin ")) {
      const password = messageText.slice(7).trim();

      if (!user.adminIpAllowed) {
        await recordSecurityEvent(
          "admin_ip_denied",
          user.securityIdentityHash,
          `Commande admin refusee pour ${user.nickname}`
        );
        emitPrivateSystem(
          socket,
          "L'acces administrateur n'est pas autorise depuis cette connexion."
        );
        return;
      }

      if (!secureSecretEqual(password, ADMIN_PASSWORD)) {
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

    if (messageText.startsWith("/unmute ")) {
      await handleModeration(socket, user, "unmute", messageText.slice(8));
      return;
    }

    if (!(await ensureUserCanSpeak(socket, user))) return;

    const blockedTerm = findBlockedTerm(messageText, AUTOMATIC_MODERATION_TERMS);
    if (AUTOMATIC_MODERATION_ENABLED && blockedTerm) {
      await handleAutomaticViolation(socket, user, {
        reason: "Contenu interdit detecte",
        fallbackMessage: "Ce message contient un terme interdit.",
        severe: true,
        excerpt: messageText,
      });
      return;
    }

    const spamCheck = checkSpam(user, messageText);
    if (!spamCheck.ok) {
      if (spamCheck.violation) {
        await handleAutomaticViolation(socket, user, {
          reason: spamCheck.reason,
          fallbackMessage: spamCheck.message,
          excerpt: messageText,
        });
      } else {
        emitPrivateSystem(socket, spamCheck.message);
      }
      return;
    }

    let reply = {
      replyToId: "",
      replyToNickname: "",
      replyToText: "",
      replyToDeleted: false,
    };
    if (replyToId) {
      const repliedMessage = await getMessageById(replyToId);
      if (
        !repliedMessage ||
        repliedMessage.room !== user.room ||
        repliedMessage.type === "system" ||
        repliedMessage.deletedAt
      ) {
        emitPrivateSystem(socket, "Le message auquel tu reponds n'est plus disponible.");
        return;
      }
      if (shouldHideMessageFromUser(repliedMessage, user)) {
        emitPrivateSystem(socket, "Debloque ce compte avant de repondre a son message.");
        return;
      }
      reply = {
        replyToId: repliedMessage.id,
        replyToNickname: repliedMessage.nickname,
        replyToText: repliedMessage.text.slice(0, 160),
        replyToDeleted: false,
      };
    }

    if (messageText.startsWith("/me ")) {
      await addMessage(user.room, {
        id: crypto.randomUUID(),
        type: "action",
        nickname: user.nickname,
        text: messageText.slice(4),
        authorId: user.messageAuthorId,
        gender: user.gender,
        role: user.role,
        ...reply,
        createdAt: Date.now(),
      }, socket.id);
      return;
    }

    await addMessage(user.room, {
      id: crypto.randomUUID(),
      type: "message",
      nickname: user.nickname,
      text: messageText,
      authorId: user.messageAuthorId,
      gender: user.gender,
      role: user.role,
      ...reply,
      createdAt: Date.now(),
    }, socket.id);
  });

  socket.on("message-action", async (payload = {}, callback) => {
    const user = users.get(socket.id);
    if (!user) return;

    const action = String(payload.action || "");
    if (!["edit", "delete", "react", "favorite", "pin", "unpin"].includes(action)) return;

    const targetMessage = await getMessageById(String(payload.id || ""));
    if (
      !targetMessage ||
      targetMessage.room !== user.room ||
      targetMessage.type === "system" ||
      targetMessage.deletedAt
    ) {
      callback?.({ ok: false, error: "Ce message n'est plus disponible." });
      return;
    }
    if (shouldHideMessageFromUser(targetMessage, user)) {
      callback?.({ ok: false, error: "Ce message appartient a un compte bloque." });
      return;
    }

    const isOwner =
      Boolean(targetMessage.authorId) &&
      targetMessage.authorId === user.messageAuthorId;
    const canModerate = MODERATION_ROLES.has(user.role);

    if (action === "favorite") {
      if (!user.accountNickname) {
        callback?.({
          ok: false,
          error: "Connecte-toi avec un compte pour enregistrer un favori.",
        });
        return;
      }

      const favorite = !user.favoriteMessageIds.has(targetMessage.id);
      await setMessageFavorite(user.accountNickname, targetMessage.id, favorite);
      if (favorite) {
        user.favoriteMessageIds.add(targetMessage.id);
      } else {
        user.favoriteMessageIds.delete(targetMessage.id);
      }
      const storedMessage =
        rooms.get(user.room).history.find((message) => message.id === targetMessage.id) ||
        targetMessage;
      for (const [socketId, connectedUser] of users.entries()) {
        if (connectedUser.accountNickname !== user.accountNickname) continue;
        if (favorite) {
          connectedUser.favoriteMessageIds.add(targetMessage.id);
        } else {
          connectedUser.favoriteMessageIds.delete(targetMessage.id);
        }
        if (connectedUser.room === user.room) {
          io.to(socketId).emit(
            "message-updated",
            serializeMessageForUser(storedMessage, connectedUser)
          );
        }
      }
      callback?.({ ok: true, favorite });
      return;
    }

    if (action === "pin" || action === "unpin") {
      if (!canModerate) {
        callback?.({
          ok: false,
          error: "Seuls les moderateurs peuvent epingler une annonce.",
        });
        return;
      }
      if (action === "unpin" && !targetMessage.pinnedAt) {
        callback?.({ ok: false, error: "Ce message n'est pas epingle." });
        return;
      }

      const room = rooms.get(user.room);
      const changedMessages = new Map();
      for (const message of room.history) {
        if (!message.pinnedAt) continue;
        message.pinnedAt = null;
        message.pinnedBy = "";
        changedMessages.set(message.id, message);
      }

      if (action === "pin") {
        const storedMessage =
          room.history.find((message) => message.id === targetMessage.id) ||
          targetMessage;
        storedMessage.pinnedAt = Date.now();
        storedMessage.pinnedBy = user.nickname;
        changedMessages.set(storedMessage.id, storedMessage);
        await setPinnedMessage(
          user.room,
          storedMessage.id,
          storedMessage.pinnedAt,
          user.nickname
        );
      } else {
        await setPinnedMessage(user.room, "", null, "");
      }

      for (const message of changedMessages.values()) {
        emitMessageToRoom("message-updated", user.room, message);
      }
      await recordModerationAction(
        user,
        action === "pin" ? "message_pinned" : "message_unpinned",
        targetMessage.nickname,
        `Message ${action === "pin" ? "epingle" : "desepingle"} dans #${user.room}`
      );
      callback?.({ ok: true });
      return;
    }

    if (action === "react") {
      if (!user.accountNickname) {
        callback?.({
          ok: false,
          error: "Connecte-toi avec un compte pour ajouter une reaction.",
        });
        return;
      }

      const reactionKey = String(payload.reaction || "");
      if (!MESSAGE_REACTIONS.has(reactionKey)) {
        callback?.({ ok: false, error: "Cette reaction n'est pas disponible." });
        return;
      }

      const now = Date.now();
      if (now - user.lastReactionAt < 250) {
        callback?.({ ok: false, error: "Attends un instant avant de reagir a nouveau." });
        return;
      }
      user.lastReactionAt = now;

      const reactionData = parseReactionData(targetMessage.reactionData);
      const accountIds = new Set(reactionData[reactionKey] || []);
      if (accountIds.has(user.messageAuthorId)) {
        accountIds.delete(user.messageAuthorId);
      } else {
        accountIds.add(user.messageAuthorId);
      }

      if (accountIds.size) {
        reactionData[reactionKey] = [...accountIds];
      } else {
        delete reactionData[reactionKey];
      }

      const serializedReactions = JSON.stringify(reactionData);
      await updateMessageReactions(targetMessage.id, serializedReactions);
      const storedMessage =
        rooms.get(user.room).history.find((message) => message.id === targetMessage.id) ||
        targetMessage;
      storedMessage.reactionData = serializedReactions;
      emitMessageToRoom("message-updated", user.room, storedMessage);
      callback?.({ ok: true });
      return;
    }

    if (action === "edit") {
      if (!isOwner) {
        callback?.({ ok: false, error: "Tu ne peux modifier que tes propres messages." });
        return;
      }

      const text = String(payload.text || "").trim().slice(0, 500);
      if (!text) {
        callback?.({ ok: false, error: "Le message ne peut pas etre vide." });
        return;
      }

      const editedAt = Date.now();
      await updateMessageText(targetMessage.id, text, editedAt);
      const storedMessage =
        rooms.get(user.room).history.find((message) => message.id === targetMessage.id) ||
        targetMessage;
      storedMessage.text = text;
      storedMessage.editedAt = editedAt;
      emitMessageToRoom("message-updated", user.room, storedMessage);
      for (const replyMessage of rooms.get(user.room).history) {
        if (
          replyMessage.replyToId !== targetMessage.id ||
          replyMessage.replyToDeleted
        ) {
          continue;
        }
        replyMessage.replyToText = text.slice(0, 160);
        emitMessageToRoom("message-updated", user.room, replyMessage);
      }
      callback?.({ ok: true });
      return;
    }

    if (!isOwner && !canModerate) {
      callback?.({ ok: false, error: "Tu ne peux pas supprimer ce message." });
      return;
    }

    const deletedAt = Date.now();
    const deletedBy = isOwner ? "author" : user.nickname;
    await deleteMessageContent(targetMessage.id, deletedAt, deletedBy);
    const room = rooms.get(user.room);
    const storedMessage =
      room.history.find((message) => message.id === targetMessage.id) ||
      targetMessage;
    storedMessage.text = "";
    storedMessage.deletedAt = deletedAt;
    storedMessage.deletedBy = deletedBy;
    storedMessage.reactionData = "{}";
    storedMessage.pinnedAt = null;
    storedMessage.pinnedBy = "";
    for (const connectedUser of users.values()) {
      connectedUser.favoriteMessageIds?.delete(targetMessage.id);
    }
    emitMessageToRoom("message-updated", user.room, storedMessage);

    for (const replyMessage of room.history) {
      if (replyMessage.replyToId !== targetMessage.id) continue;
      replyMessage.replyToText = "";
      replyMessage.replyToDeleted = true;
      emitMessageToRoom("message-updated", user.room, replyMessage);
    }

    if (!isOwner && canModerate) {
      await recordModerationAction(
        user,
        "message_deleted",
        targetMessage.nickname,
        `Message supprime dans #${user.room}`
      );
    }
    callback?.({ ok: true });
  });

  socket.on("admin-action", async ({ action, nickname }) => {
    const user = users.get(socket.id);
    if (!user) return;

    const allowedActions = new Set(["kick", "ban", "unban", "unmute"]);
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

  socket.on("security-action", async ({ action } = {}) => {
    const user = users.get(socket.id);
    if (!user || user.role !== "admin") {
      emitPrivateSystem(socket, "Journal de securite reserve aux admins.");
      return;
    }

    if (action === "list") await sendSecurityEvents(socket);
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
    publishUsers();
    emitPrivateSystem(socket, "Ton profil a ete mis a jour.");
    await sendProfile(socket, user, user.nickname);
  });

  socket.on("settings-action", async (payload = {}, callback) => {
    const user = users.get(socket.id);
    if (!user?.accountNickname) {
      callback?.({ ok: false, error: "Les parametres sont reserves aux comptes inscrits." });
      return;
    }

    try {
      await handleSettingsAction(socket, user, payload, callback);
    } catch (error) {
      console.error("Erreur parametres du compte:", error);
      callback?.({
        ok: false,
        error: "Les parametres n'ont pas pu etre mis a jour. Reessaie plus tard.",
      });
    }
  });

  socket.on("block-action", async (payload = {}, callback) => {
    const user = users.get(socket.id);
    if (!user?.accountNickname) {
      callback?.({
        ok: false,
        error: "Le blocage est reserve aux comptes inscrits.",
      });
      return;
    }

    try {
      const targetAccount = await changeUserBlockState(
        user.accountNickname,
        payload.nickname,
        payload.blocked !== false
      );
      callback?.({
        ok: true,
        blocked: payload.blocked !== false,
        accountNickname: targetAccount.nickname,
        displayName: targetAccount.displayName,
        settings: await buildAccountSettings(user.accountNickname),
      });
    } catch (error) {
      console.error("Erreur blocage utilisateur:", error);
      const publicError = [
        "Choisis un autre compte.",
        "Ce compte n'existe pas.",
      ].includes(error.message)
        ? error.message
        : "Le blocage n'a pas pu etre modifie.";
      callback?.({
        ok: false,
        error: publicError,
      });
    }
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

  socket.on("report-action", async (payload = {}) => {
    const user = users.get(socket.id);
    if (!user) return;

    if (payload.action === "create") {
      await handleCreateReport(socket, user, payload);
      return;
    }

    if (!MODERATION_ROLES.has(user.role)) {
      emitPrivateSystem(socket, "Gestion des signalements reservee a la moderation.");
      return;
    }

    await handleReportModeration(socket, user, payload);
  });

  socket.on("contact-action", async (payload = {}) => {
    const user = users.get(socket.id);
    if (!user || user.role !== "admin") {
      emitPrivateSystem(socket, "Gestion des contacts reservee aux admins.");
      return;
    }

    await handleContactAction(socket, user, payload);
  });

  socket.on("disconnect", async () => {
    const user = users.get(socket.id);
    if (!user) return;

    clearUserTyping(user, false);
    users.delete(socket.id);
    publishTyping(user.room);
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

function normalizeEmail(value) {
  return String(value || "").trim().toLocaleLowerCase("fr-FR").slice(0, 254);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function hashResetToken(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

function parseCookies(rawCookieHeader) {
  const cookies = new Map();
  for (const part of String(rawCookieHeader || "").split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex < 1) continue;
    const name = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (!name) continue;
    cookies.set(name, value);
  }
  return cookies;
}

function getSessionTokenFromHeaders(headers = {}) {
  const token = parseCookies(headers.cookie).get(ACCOUNT_SESSION_COOKIE) || "";
  return /^[a-f0-9]{64}$/i.test(token) ? token : "";
}

function setSessionCookie(request, response, rawToken) {
  const secure = ACCOUNT_SESSION_SECURE || request.secure ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `${ACCOUNT_SESSION_COOKIE}=${rawToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${
      ACCOUNT_SESSION_TTL_MS / 1000
    }; Priority=High${secure}`
  );
}

function clearSessionCookie(request, response) {
  const secure = ACCOUNT_SESSION_SECURE || request.secure ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `${ACCOUNT_SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0; Priority=High${secure}`
  );
}

async function getSessionAccountFromHeaders(headers = {}) {
  const rawToken = getSessionTokenFromHeaders(headers);
  if (!rawToken) return null;

  const tokenHash = hashResetToken(rawToken);
  const session = await getAccountSession(tokenHash);
  if (!session || Number(session.expiresAt) <= Date.now()) {
    if (session) await deleteAccountSession(tokenHash);
    return null;
  }

  const account = await getAccountByNickname(session.accountNickname);
  if (
    !account ||
    !account.active ||
    (EMAIL_VERIFICATION_ENABLED && !account.emailVerified)
  ) {
    await deleteAccountSession(tokenHash);
    return null;
  }

  const now = Date.now();
  if (now - Number(session.lastUsedAt || 0) > 5 * 60_000) {
    await touchAccountSession(tokenHash, now);
  }
  return { account, session, tokenHash };
}

function canRequestPasswordReset(identityHash) {
  const now = Date.now();
  const recentRequests = keepRecent(
    passwordResetRateLimits.get(identityHash) || [],
    PASSWORD_RESET_WINDOW_MS,
    now
  );
  if (recentRequests.length >= MAX_PASSWORD_RESET_REQUESTS) {
    passwordResetRateLimits.set(identityHash, recentRequests);
    return false;
  }
  recentRequests.push(now);
  passwordResetRateLimits.set(identityHash, recentRequests);

  if (passwordResetRateLimits.size > 5000) {
    for (const [key, timestamps] of passwordResetRateLimits.entries()) {
      const recent = keepRecent(timestamps, PASSWORD_RESET_WINDOW_MS, now);
      if (recent.length) {
        passwordResetRateLimits.set(key, recent);
      } else {
        passwordResetRateLimits.delete(key);
      }
    }
  }
  return true;
}

function canRequestEmailVerification(identityHash) {
  const now = Date.now();
  const recentRequests = keepRecent(
    emailVerificationRateLimits.get(identityHash) || [],
    PASSWORD_RESET_WINDOW_MS,
    now
  );
  if (recentRequests.length >= MAX_EMAIL_VERIFICATION_REQUESTS) {
    emailVerificationRateLimits.set(identityHash, recentRequests);
    return false;
  }
  recentRequests.push(now);
  emailVerificationRateLimits.set(identityHash, recentRequests);
  return true;
}

function getPublicBaseUrl(socket) {
  let baseUrl = PUBLIC_URL;
  if (!/^https?:\/\/[^/]+/i.test(baseUrl)) {
    const origin = String(socket.handshake.headers.origin || "").replace(/\/+$/, "");
    if (/^https?:\/\/[^/]+/i.test(origin)) {
      baseUrl = origin;
    } else {
      const protocol = String(socket.handshake.headers["x-forwarded-proto"] || "http")
        .split(",")[0]
        .trim();
      const host = String(socket.handshake.headers.host || `localhost:${PORT}`);
      baseUrl = `${protocol}://${host}`;
    }
  }
  return baseUrl;
}

function buildPasswordResetUrl(socket, token) {
  return `${getPublicBaseUrl(socket)}/?resetToken=${encodeURIComponent(token)}`;
}

function buildEmailVerificationUrl(socket, token) {
  return `${getPublicBaseUrl(socket)}/?verifyEmail=${encodeURIComponent(token)}`;
}

async function issueEmailVerification(account, socket) {
  const rawToken = randomBytes(32).toString("hex");
  const createdAt = Date.now();
  await createEmailVerificationToken({
    tokenHash: hashResetToken(rawToken),
    accountNickname: account.nickname,
    email: account.email,
    expiresAt: createdAt + EMAIL_VERIFICATION_TTL_MS,
    createdAt,
  });
  await sendEmailVerification(
    account,
    buildEmailVerificationUrl(socket, rawToken)
  );
}

async function sendPasswordResetEmail(account, resetUrl) {
  await sendTransactionalEmail({
    account,
    subject: "Reinitialisation de ton mot de passe Tchatelia",
    textContent:
      `Bonjour ${account.displayName},\n\n` +
      "Une demande de reinitialisation a ete faite pour ton compte Tchatelia.\n\n" +
      `Choisis un nouveau mot de passe avec ce lien valable 30 minutes :\n${resetUrl}\n\n` +
      "Si tu n'es pas a l'origine de cette demande, ignore simplement cet e-mail.",
  });
}

async function sendEmailVerification(account, verificationUrl) {
  await sendTransactionalEmail({
    account,
    subject: "Confirme ton adresse e-mail Tchatelia",
    textContent:
      `Bonjour ${account.displayName},\n\n` +
      "Ton compte Tchatelia a bien ete cree.\n\n" +
      `Confirme ton adresse avec ce lien valable 24 heures :\n${verificationUrl}\n\n` +
      "Si tu n'es pas a l'origine de cette inscription, ignore simplement cet e-mail.",
  });
}

function hasConnectedModerator() {
  return [...users.values()].some((user) => MODERATION_ROLES.has(user.role));
}

function queueModerationAlert({ key, subject, textContent }) {
  if (!MODERATION_ALERT_EMAIL_ENABLED || hasConnectedModerator()) return;

  const now = Date.now();
  moderationAlertHistory = moderationAlertHistory.filter(
    (sentAt) => now - sentAt < MODERATION_ALERT_WINDOW_MS
  );
  if (moderationAlertHistory.length >= MAX_MODERATION_ALERTS_PER_WINDOW) return;

  const alertKey = String(key || "moderation").slice(0, 120);
  const previousAlertAt = moderationAlertRateLimits.get(alertKey) || 0;
  if (now - previousAlertAt < MODERATION_ALERT_COOLDOWN_MS) return;

  moderationAlertRateLimits.set(alertKey, now);
  moderationAlertHistory.push(now);
  if (moderationAlertRateLimits.size > 1000) {
    for (const [storedKey, sentAt] of moderationAlertRateLimits.entries()) {
      if (now - sentAt >= MODERATION_ALERT_COOLDOWN_MS) {
        moderationAlertRateLimits.delete(storedKey);
      }
    }
  }

  void sendTransactionalEmail({
    recipientEmail: MODERATION_ALERT_EMAIL,
    recipientName: "Administration Tchatelia",
    subject,
    textContent,
  }).catch((error) => {
    moderationAlertRateLimits.delete(alertKey);
    console.error("Erreur alerte de moderation:", error.message);
  });
}

async function sendTransactionalEmail({
  account,
  recipientEmail,
  recipientName,
  subject,
  textContent,
}) {
  const destinationEmail = normalizeEmail(recipientEmail || account?.email);
  const destinationName = String(
    recipientName || account?.displayName || "Utilisateur Tchatelia"
  )
    .trim()
    .slice(0, 70);
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: MAIL_FROM_NAME || "Tchatelia",
        email: MAIL_FROM_EMAIL,
      },
      to: [
        {
          email: destinationEmail,
          name: destinationName,
        },
      ],
      subject,
      textContent,
    }),
  });

  if (!response.ok) {
    const details = (await response.text()).slice(0, 300);
    throw new Error(`Brevo ${response.status}: ${details}`);
  }
}

function isRequestOriginAllowed(source) {
  const headers = source.headers || source.handshake?.headers || {};
  const forwardedProtocol = String(headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const protocol =
    forwardedProtocol ||
    source.protocol ||
    (source.secure || source.socket?.encrypted ? "https" : "http");
  const forwardedHost = String(headers["x-forwarded-host"] || "")
    .split(",")[0]
    .trim();
  const host = forwardedHost || String(headers.host || "").trim();
  const allowedOrigins = [PUBLIC_URL];
  if (host) allowedOrigins.push(`${protocol}://${host}`);
  return isAllowedOrigin(headers.origin, allowedOrigins);
}

function normalizeName(value) {
  return String(value || "").trim().toLocaleLowerCase("fr-FR");
}

function normalizeGender(value) {
  const gender = String(value || "").trim().toLocaleLowerCase("en-US");
  return ACCOUNT_GENDERS.has(gender) ? gender : "other";
}

function isAdminAccessAllowed(source) {
  return isIpAddressAllowed(
    getSecurityIdentity(source).rawIp,
    ADMIN_ALLOWED_IPS
  );
}

function getSecurityIdentity(source) {
  const headers = source.handshake?.headers || source.headers || {};
  const forwardedFor = getForwardedClientIp(headers["x-forwarded-for"]);
  const rawIp =
    forwardedFor ||
    source.handshake?.address ||
    source.ip ||
    source.socket?.remoteAddress ||
    "unknown";
  const hash = createHmac("sha256", SECURITY_HASH_SECRET)
    .update(rawIp)
    .digest("hex")
    .slice(0, 16);
  return { rawIp, hash };
}

function getProtectionState(identityHash) {
  let state = protectionStates.get(identityHash);
  if (!state) {
    state = {
      attempts: [],
      failures: [],
      registrations: [],
      lockedUntil: 0,
    };
    protectionStates.set(identityHash, state);
  }
  return state;
}

function keepRecent(timestamps, windowMs, now) {
  return timestamps.filter((timestamp) => now - timestamp < windowMs);
}

async function checkJoinProtection(identity, authMode, nickname) {
  if (!PUBLIC_PROTECTION_ENABLED) return { ok: true };

  const now = Date.now();
  const isTrustedSession = authMode === "session";
  const state = getProtectionState(identity.hash);
  state.attempts = keepRecent(state.attempts, AUTH_WINDOW_MS, now);
  state.failures = keepRecent(state.failures, AUTH_LOCK_MS, now);
  state.registrations = keepRecent(
    state.registrations,
    REGISTRATION_WINDOW_MS,
    now
  );

  if (!isTrustedSession && state.lockedUntil > now) {
    const minutes = Math.max(1, Math.ceil((state.lockedUntil - now) / 60_000));
    return {
      ok: false,
      error: `Acces temporairement verrouille. Reessaie dans ${minutes} min.`,
    };
  }

  if (!isTrustedSession && state.attempts.length >= MAX_AUTH_ATTEMPTS) {
    state.lockedUntil = now + AUTH_LOCK_MS;
    await recordSecurityEvent(
      "access_rate_limit",
      identity.hash,
      `Trop de tentatives pour ${nickname}`
    );
    return {
      ok: false,
      error: "Trop de tentatives. Acces verrouille pendant 15 minutes.",
    };
  }

  const connectedCount = [...users.values()].filter(
    (user) => user.securityIdentityHash === identity.hash
  ).length;
  if (connectedCount >= MAX_CONNECTIONS_PER_IDENTITY) {
    await recordSecurityEvent(
      "connection_limit",
      identity.hash,
      `Limite de connexions atteinte pour ${nickname}`
    );
    return {
      ok: false,
      error: "Trop de connexions simultanees depuis ce reseau.",
    };
  }

  if (isTrustedSession) return { ok: true };

  if (
    authMode === "register" &&
    state.registrations.length >= MAX_REGISTRATIONS
  ) {
    await recordSecurityEvent(
      "registration_limit",
      identity.hash,
      `Limite d'inscriptions atteinte pour ${nickname}`
    );
    return {
      ok: false,
      error: "Limite de creation de comptes atteinte. Reessaie plus tard.",
    };
  }

  state.attempts.push(now);
  if (protectionStates.size > 5000) {
    for (const [key, candidate] of protectionStates.entries()) {
      const latestActivity = Math.max(
        candidate.lockedUntil,
        ...candidate.attempts,
        ...candidate.failures,
        ...candidate.registrations,
        0
      );
      if (now - latestActivity > REGISTRATION_WINDOW_MS) {
        protectionStates.delete(key);
      }
    }
  }
  return { ok: true };
}

async function registerAuthFailure(identityHash, eventType, nickname) {
  if (!PUBLIC_PROTECTION_ENABLED) return;

  const now = Date.now();
  const state = getProtectionState(identityHash);
  state.failures = keepRecent(state.failures, AUTH_LOCK_MS, now);
  state.failures.push(now);
  await recordSecurityEvent(
    eventType,
    identityHash,
    `Echec de connexion pour ${nickname}`
  );

  if (state.failures.length >= MAX_AUTH_FAILURES) {
    state.lockedUntil = now + AUTH_LOCK_MS;
    await recordSecurityEvent(
      "temporary_lock",
      identityHash,
      `Acces verrouille apres ${state.failures.length} echecs`
    );
  }
}

function registerSuccessfulAccess(identityHash, authMode) {
  if (!PUBLIC_PROTECTION_ENABLED) return;

  const state = getProtectionState(identityHash);
  if (authMode === "login") {
    state.failures = [];
    state.lockedUntil = 0;
  }
  if (authMode === "register") {
    state.registrations.push(Date.now());
  }
}

async function verifyTurnstileToken(rawToken, remoteIp) {
  if (!TURNSTILE_ENABLED) return true;
  const token = String(rawToken || "").trim();
  if (!token || token.length > 2048) return false;

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          secret: TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: remoteIp,
          idempotency_key: randomUUID(),
        }),
        signal: AbortSignal.timeout(7000),
      }
    );
    if (!response.ok) return false;
    const verification = await response.json();
    return verification.success === true;
  } catch (error) {
    console.error("Erreur de verification Turnstile:", error.message);
    return false;
  }
}

function cleanDisplayName(value) {
  return String(value || "")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .slice(0, 18);
}

async function findAccountByIdentity(rawNickname) {
  const normalized = normalizeName(rawNickname);
  if (!normalized) return null;

  const directAccount = await getAccountByNickname(normalized);
  if (directAccount) return directAccount;

  const accountMatch = (await listAccounts()).find(
    (account) => normalizeName(account.displayName) === normalized
  );
  return accountMatch ? getAccountByNickname(accountMatch.nickname) : null;
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
  if (
    typeof password !== "string" ||
    password.length > MAX_PASSWORD_LENGTH ||
    !account?.salt ||
    !account?.passwordHash
  ) {
    return false;
  }
  const derivedKey = await scrypt(password, account.salt, 64);
  const storedHash = Buffer.from(account.passwordHash, "hex");

  return storedHash.length === derivedKey.length && timingSafeEqual(storedHash, derivedKey);
}

async function consumePasswordVerificationTime(password) {
  await scrypt(
    String(password || "").slice(0, MAX_PASSWORD_LENGTH),
    "tchatelia-missing-account",
    64
  );
}

function secureSecretEqual(value, expectedValue) {
  const providedHash = createHash("sha256")
    .update(String(value || ""))
    .digest();
  const expectedHash = createHash("sha256")
    .update(String(expectedValue || ""))
    .digest();
  return timingSafeEqual(providedHash, expectedHash);
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

  const connectedTarget = findUserByNickname(rawNickname);
  const account =
    (await getAccountByNickname(nickname)) ||
    (connectedTarget?.[1].accountNickname
      ? await getAccountByNickname(connectedTarget[1].accountNickname)
      : null);
  if (account) {
    const blockState =
      viewer.accountNickname && viewer.accountNickname !== account.nickname
        ? await getPrivateBlockState(viewer.accountNickname, account.nickname)
        : { blockedByMe: false, blockedByThem: false };
    socket.emit("profile", {
      accountNickname: account.nickname,
      nickname: account.displayName,
      role: account.role,
      gender: normalizeGender(account.gender),
      bio: account.bio,
      avatarUrl: account.avatarUrl,
      createdAt: account.createdAt,
      account: true,
      isOwn: viewer.accountNickname === account.nickname,
      privateMessagesEnabled: Boolean(account.privateMessagesEnabled),
      blockedByMe: blockState.blockedByMe,
      blockedByThem: blockState.blockedByThem,
    });
    return;
  }

  if (!connectedTarget) {
    emitPrivateSystem(socket, "Profil introuvable.");
    return;
  }

  const target = connectedTarget[1];
  socket.emit("profile", {
    accountNickname: "",
    nickname: target.nickname,
    role: target.role,
    gender: normalizeGender(target.gender),
    bio: "",
    avatarUrl: "",
    createdAt: target.memberSince,
    account: false,
    isOwn: false,
    privateMessagesEnabled: false,
    blockedByMe: false,
    blockedByThem: false,
  });
}

async function buildAccountSettings(accountNickname) {
  const [account, blockedUsers] = await Promise.all([
    getAccountByNickname(accountNickname),
    listPrivateBlocks(accountNickname),
  ]);
  if (!account) return null;

  return {
    accountNickname: account.nickname,
    displayName: account.displayName,
    email: account.email || "",
    emailVerified: Boolean(account.emailVerified),
    privateMessagesEnabled: Boolean(account.privateMessagesEnabled),
    blockedUsers: blockedUsers.map((blockedUser) => ({
      accountNickname: blockedUser.blocked,
      displayName: blockedUser.displayName,
      createdAt: blockedUser.createdAt,
    })),
  };
}

async function changeUserBlockState(
  blockerAccountNickname,
  rawTargetNickname,
  shouldBlock
) {
  const targetNickname = normalizeName(rawTargetNickname);
  if (!targetNickname || targetNickname === blockerAccountNickname) {
    throw new Error("Choisis un autre compte.");
  }

  const targetAccount = await getAccountByNickname(targetNickname);
  if (!targetAccount) {
    throw new Error("Ce compte n'existe pas.");
  }

  await setPrivateBlock(
    blockerAccountNickname,
    targetAccount.nickname,
    shouldBlock
  );

  const affectedRooms = new Set();
  for (const [socketId, connectedUser] of users.entries()) {
    if (connectedUser.accountNickname !== blockerAccountNickname) continue;

    if (!(connectedUser.blockedAccountNicknames instanceof Set)) {
      connectedUser.blockedAccountNicknames = new Set();
    }
    if (shouldBlock) {
      connectedUser.blockedAccountNicknames.add(targetAccount.nickname);
    } else {
      connectedUser.blockedAccountNicknames.delete(targetAccount.nickname);
    }

    affectedRooms.add(connectedUser.room);
    const connectedSocket = io.sockets.sockets.get(socketId);
    if (connectedSocket) {
      sendRoomHistory(connectedSocket, connectedUser, connectedUser.room);
    }
  }

  emitToAccount(blockerAccountNickname, "user-block-changed", {
    accountNickname: targetAccount.nickname,
    displayName: targetAccount.displayName,
    blocked: shouldBlock,
  });
  emitToAccount(blockerAccountNickname, "private-block-changed", {
    nickname: targetAccount.nickname,
  });
  emitToAccount(targetAccount.nickname, "private-block-changed", {
    nickname: blockerAccountNickname,
  });

  for (const room of affectedRooms) publishTyping(room);
  await Promise.all([
    refreshPrivateStateForAccount(blockerAccountNickname),
    refreshPrivateStateForAccount(targetAccount.nickname),
  ]);

  return targetAccount;
}

async function handleSettingsAction(socket, user, payload, callback) {
  const action = String(payload.action || "");
  const account = await getAccountByNickname(user.accountNickname);
  if (!account) {
    callback?.({ ok: false, error: "Compte introuvable." });
    return;
  }

  if (action === "get") {
    callback?.({ ok: true, settings: await buildAccountSettings(account.nickname) });
    return;
  }

  if (action === "update") {
    const displayName = cleanDisplayName(payload.displayName);
    if (displayName.length < 2) {
      callback?.({ ok: false, error: "Le nom affiche doit contenir au moins 2 caracteres." });
      return;
    }

    const normalizedDisplayName = normalizeName(displayName);
    if (await isBanned(normalizedDisplayName)) {
      callback?.({ ok: false, error: "Ce nom affiche est banni du chat." });
      return;
    }

    const conflictingAccount = (await listAccounts()).find(
      (candidate) =>
        candidate.nickname !== account.nickname &&
        (normalizeName(candidate.nickname) === normalizedDisplayName ||
          normalizeName(candidate.displayName) === normalizedDisplayName)
    );
    const conflictingUser = [...users.values()].find(
      (candidate) =>
        candidate.accountNickname !== account.nickname &&
        normalizeName(candidate.nickname) === normalizedDisplayName
    );
    if (conflictingAccount || conflictingUser) {
      callback?.({ ok: false, error: "Ce nom affiche est deja utilise." });
      return;
    }

    const privateMessagesEnabled = payload.privateMessagesEnabled === true;
    const email = normalizeEmail(payload.email);
    if (!isValidEmail(email)) {
      callback?.({
        ok: false,
        error: "Saisis une adresse e-mail valide pour recuperer ton compte.",
      });
      return;
    }
    const accountWithEmail = await getAccountByEmail(email);
    if (accountWithEmail && accountWithEmail.nickname !== account.nickname) {
      callback?.({
        ok: false,
        error: "Cette adresse e-mail est deja associee a un autre compte.",
      });
      return;
    }
    const emailChanged = email !== normalizeEmail(account.email);
    const emailVerified = emailChanged
      ? !EMAIL_VERIFICATION_ENABLED
      : Boolean(account.emailVerified);
    if (emailChanged) {
      await clearAccountEmailTokens(account.nickname);
    }
    await updateAccountSettings(account.nickname, {
      displayName,
      privateMessagesEnabled,
      email,
      emailVerified,
    });
    updateConnectedAccount(account.nickname, {
      nickname: displayName,
      privateMessagesEnabled,
      emailVerified,
    });
    emitToAccount(account.nickname, "account-updated", {
      nickname: displayName,
      privateMessagesEnabled,
      emailVerified,
    });
    for (const room of rooms.keys()) publishUsers(room);
    await publishAccountLists();
    await refreshPrivateStatesForConnectedAccounts();
    let message = "Preferences enregistrees.";
    if (emailChanged && EMAIL_VERIFICATION_ENABLED) {
      try {
        await issueEmailVerification(
          {
            ...account,
            displayName,
            email,
            emailVerified: false,
          },
          socket
        );
        message = "Preferences enregistrees. Consulte ton e-mail pour confirmer la nouvelle adresse.";
      } catch (error) {
        console.error("Erreur verification apres changement d'e-mail:", error.message);
        message =
          "Preferences enregistrees, mais l'e-mail n'a pas pu etre envoye. Utilise Renvoyer.";
      }
    }
    callback?.({
      ok: true,
      message,
      settings: await buildAccountSettings(account.nickname),
    });
    return;
  }

  if (action === "password") {
    const currentPassword = String(payload.currentPassword || "");
    const newPassword = String(payload.newPassword || "");
    if (!(await verifyPassword(currentPassword, account))) {
      callback?.({ ok: false, error: "Le mot de passe actuel est incorrect." });
      return;
    }
    const passwordError = getNewPasswordError(newPassword, [
      account.nickname,
      account.displayName,
      normalizeEmail(account.email).split("@")[0],
    ]);
    if (passwordError) {
      callback?.({ ok: false, error: passwordError });
      return;
    }
    if (currentPassword === newPassword) {
      callback?.({ ok: false, error: "Choisis un nouveau mot de passe different." });
      return;
    }

    await updateAccountPassword(account.nickname, await hashPassword(newPassword));
    await revokeAccountSessions(
      account.nickname,
      "Ton mot de passe a change. Reconnecte-toi.",
      socket.id
    );
    callback?.({
      ok: true,
      sessionRevoked: true,
      message: "Mot de passe modifie. Reconnecte-toi.",
    });
    return;
  }

  if (action === "logout-all") {
    await revokeAccountSessions(
      account.nickname,
      "Toutes les sessions de ton compte ont ete fermees.",
      socket.id
    );
    callback?.({
      ok: true,
      sessionRevoked: true,
      message: "Toutes les sessions ont ete fermees.",
    });
    return;
  }

  if (action === "unblock") {
    const blockedNickname = normalizeName(payload.nickname);
    if (!blockedNickname || blockedNickname === account.nickname) {
      callback?.({ ok: false, error: "Compte bloque introuvable." });
      return;
    }
    await changeUserBlockState(account.nickname, blockedNickname, false);
    callback?.({ ok: true, settings: await buildAccountSettings(account.nickname) });
    return;
  }

  if (action === "delete") {
    const currentPassword = String(payload.currentPassword || "");
    if (!(await verifyPassword(currentPassword, account))) {
      callback?.({ ok: false, error: "Le mot de passe actuel est incorrect." });
      return;
    }

    await deleteAccount(account.nickname);
    removeAccountReactionsFromRooms(account.nickname);
    callback?.({ ok: true });
    emitToAccount(account.nickname, "account-deleted", {});
    await publishAccountLists();
    await refreshPrivateStatesForConnectedAccounts(account.nickname);
    disconnectDeletedAccountLater(account.nickname);
    return;
  }

  callback?.({ ok: false, error: "Action inconnue." });
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
    await changeUserBlockState(
      user.accountNickname,
      targetNickname,
      action === "block"
    );
    await sendPrivateConversation(socket, user.accountNickname, targetAccount);
    return;
  }

  if (action !== "send") return;
  if (!targetAccount.active) {
    emitPrivateError(socket, "Ce compte est desactive.");
    return;
  }
  if (!user.privateMessagesEnabled) {
    emitPrivateError(socket, "Reactive les messages prives dans tes parametres.");
    return;
  }
  if (!Boolean(targetAccount.privateMessagesEnabled)) {
    emitPrivateError(socket, "Cette personne n'accepte pas les messages prives.");
    return;
  }

  const text = String(payload.text || "").trim().slice(0, 500);
  if (!text) return;

  const blockState = await getPrivateBlockState(user.accountNickname, targetNickname);
  if (blockState.blockedByMe || blockState.blockedByThem) {
    emitPrivateError(socket, "Cette conversation est bloquee.");
    return;
  }

  if (!(await ensureUserCanSpeak(socket, user, true))) return;

  const blockedTerm = findBlockedTerm(text, AUTOMATIC_MODERATION_TERMS);
  if (AUTOMATIC_MODERATION_ENABLED && blockedTerm) {
    await handleAutomaticViolation(socket, user, {
      reason: "Contenu interdit detecte",
      fallbackMessage: "Ce message contient un terme interdit.",
      severe: true,
      excerpt: text,
      privateContext: true,
    });
    return;
  }

  const spamCheck = checkSpam(user, text);
  if (!spamCheck.ok) {
    if (spamCheck.violation) {
      await handleAutomaticViolation(socket, user, {
        reason: spamCheck.reason,
        fallbackMessage: spamCheck.message,
        excerpt: text,
        privateContext: true,
      });
    } else {
      emitPrivateError(socket, spamCheck.message);
    }
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
      gender: normalizeGender(targetAccount.gender),
      privateMessagesEnabled: Boolean(targetAccount.privateMessagesEnabled),
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
    available: Boolean(targetAccount.active && targetAccount.privateMessagesEnabled),
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
          gender: normalizeGender(account.gender),
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

async function refreshPrivateStatesForConnectedAccounts(excludedAccount = "") {
  const connectedAccounts = new Set(
    [...users.values()]
      .map((connectedUser) => connectedUser.accountNickname)
      .filter(
        (accountNickname) =>
          accountNickname && accountNickname !== excludedAccount
      )
  );
  await Promise.all(
    [...connectedAccounts].map((accountNickname) =>
      refreshPrivateStateForAccount(accountNickname)
    )
  );
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

async function handleCreateReport(socket, user, payload) {
  if (!user.accountNickname) {
    socket.emit("report-error", {
      text: "Les signalements sont reserves aux comptes inscrits.",
    });
    return;
  }

  const now = Date.now();
  if (now - user.lastReportAt < 15_000) {
    socket.emit("report-error", {
      text: "Attends quelques secondes avant d'envoyer un autre signalement.",
    });
    return;
  }

  const allowedKinds = new Set(["profile", "public_message", "private_message"]);
  const allowedReasons = new Set(["spam", "harassment", "inappropriate", "other"]);
  const kind = allowedKinds.has(payload.kind) ? payload.kind : "";
  const reason = allowedReasons.has(payload.reason) ? payload.reason : "other";
  const details = String(payload.details || "").trim().slice(0, 300);

  if (!kind) {
    socket.emit("report-error", { text: "Type de signalement invalide." });
    return;
  }

  let target = "";
  let targetDisplay = "";
  let reference = "";
  let contentSnapshot = "";
  let room = "";

  if (kind === "public_message") {
    const message = await getMessageById(String(payload.messageId || ""));
    if (!message || message.type === "system" || message.deletedAt) {
      socket.emit("report-error", { text: "Ce message n'est plus disponible." });
      return;
    }

    target = normalizeName(message.nickname);
    targetDisplay = message.nickname;
    reference = `public_message:${message.id}`;
    contentSnapshot = message.text;
    room = `#${message.room}`;
  }

  if (kind === "private_message") {
    const message = await getPrivateMessageById(String(payload.messageId || ""));
    if (!message || message.recipient !== user.accountNickname) {
      socket.emit("report-error", { text: "Ce message prive ne peut pas etre signale." });
      return;
    }

    const sender = await getAccountByNickname(message.sender);
    if (!sender) {
      socket.emit("report-error", { text: "Le compte concerne n'existe plus." });
      return;
    }

    target = sender.nickname;
    targetDisplay = sender.displayName;
    reference = `private_message:${message.id}`;
    contentSnapshot = message.text;
    room = "Message prive";
  }

  if (kind === "profile") {
    target = normalizeName(payload.target);
    if (!target) {
      socket.emit("report-error", { text: "Ce profil est introuvable." });
      return;
    }

    const account = await getAccountByNickname(target);
    const connectedTarget = findUserByNickname(payload.target);
    if (!account && !connectedTarget) {
      socket.emit("report-error", { text: "Ce profil est introuvable." });
      return;
    }

    targetDisplay = account?.displayName || connectedTarget[1].nickname;
    reference = `profile:${target}`;
    contentSnapshot = account?.bio || `Profil de ${targetDisplay}`;
    room = `#${user.room}`;
  }

  if (target === user.accountNickname || normalizeName(targetDisplay) === user.accountNickname) {
    socket.emit("report-error", { text: "Tu ne peux pas te signaler toi-meme." });
    return;
  }

  if (await hasOpenReport(user.accountNickname, reference)) {
    socket.emit("report-error", {
      text: "Tu as deja un signalement ouvert pour cet element.",
    });
    return;
  }

  await createReport({
    id: crypto.randomUUID(),
    reporter: user.accountNickname,
    reporterDisplay: user.nickname,
    target,
    targetDisplay,
    kind,
    reference,
    reason,
    details,
    contentSnapshot,
    room,
    createdAt: now,
  });
  user.lastReportAt = now;
  socket.emit("report-created");
  await publishReports();
  queueModerationAlert({
    key: `report:${target}`,
    subject: `Nouveau signalement : ${targetDisplay}`,
    textContent:
      `Un signalement attend dans le centre de moderation Tchatelia.\n\n` +
      `Signale par : ${user.nickname}\n` +
      `Personne concernee : ${targetDisplay}\n` +
      `Motif : ${reason}\n` +
      `Emplacement : ${room}\n` +
      `Details : ${details || "Aucun detail"}\n` +
      `Extrait : ${contentSnapshot.slice(0, 240)}\n\n` +
      `Ouvre le centre de moderation : ${PUBLIC_URL || "Tchatelia"}`,
  });
}

async function handleReportModeration(socket, moderator, payload) {
  if (payload.action === "list") {
    await sendReports(socket);
    return;
  }

  const status =
    payload.action === "resolve"
      ? "resolved"
      : payload.action === "dismiss"
        ? "dismissed"
        : "";
  if (!status) return;

  const report = await getReportById(String(payload.id || ""));
  if (!report || report.status !== "open") {
    emitPrivateSystem(socket, "Ce signalement a deja ete traite ou n'existe plus.");
    return;
  }

  await updateReportStatus(report.id, status, moderator.nickname);
  await recordModerationAction(
    moderator,
    status === "resolved" ? "report_resolved" : "report_dismissed",
    report.targetDisplay,
    `${report.kind} - ${report.reason}`
  );
  emitPrivateSystem(
    socket,
    status === "resolved" ? "Signalement marque comme traite." : "Signalement rejete."
  );
  await publishReports();
}

async function sendReports(socket) {
  socket.emit("reports", await listReports(100));
}

async function publishReports() {
  const reports = await listReports(100);
  for (const [socketId, connectedUser] of users.entries()) {
    if (MODERATION_ROLES.has(connectedUser.role)) {
      io.to(socketId).emit("reports", reports);
    }
  }
}

async function handleContactAction(socket, admin, payload) {
  if (payload.action === "list") {
    await sendContactMessages(socket);
    return;
  }

  if (payload.action !== "resolve") return;
  const contactMessage = await getContactMessageById(String(payload.id || ""));
  if (!contactMessage || contactMessage.status !== "open") {
    emitPrivateSystem(socket, "Ce message de contact a deja ete traite ou n'existe plus.");
    return;
  }

  await updateContactMessageStatus(contactMessage.id, "resolved", admin.nickname);
  await recordModerationAction(
    admin,
    "contact_resolved",
    contactMessage.name,
    `Demande ${contactMessage.subject} traitee`
  );
  emitPrivateSystem(socket, "Message de contact marque comme traite.");
  await publishContactMessages();
}

async function sendContactMessages(socket) {
  socket.emit("contact-messages", await listContactMessages(100));
}

async function publishContactMessages() {
  const contactMessages = await listContactMessages(100);
  for (const [socketId, connectedUser] of users.entries()) {
    if (connectedUser.role === "admin") {
      io.to(socketId).emit("contact-messages", contactMessages);
    }
  }
}

async function sendAccountList(socket) {
  const accounts = await listAccounts();
  socket.emit("accounts", accounts);
}

async function publishAccountLists() {
  const accounts = await listAccounts();
  for (const [socketId, connectedUser] of users.entries()) {
    if (connectedUser.role === "admin") {
      io.to(socketId).emit("accounts", accounts);
    }
  }
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
    if (!active) {
      await deleteAccountSessions(nickname);
      disconnectAccount(nickname, "Ton compte a ete desactive.");
    }
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
    const passwordError = getNewPasswordError(password, [
      account.nickname,
      account.displayName,
      normalizeEmail(account.email).split("@")[0],
    ]);
    if (passwordError) {
      emitPrivateSystem(socket, passwordError);
      return;
    }

    await updateAccountPassword(nickname, await hashPassword(password));
    await revokeAccountSessions(
      nickname,
      "Ton mot de passe a ete reinitialise. Reconnecte-toi."
    );
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

async function revokeAccountSessions(accountNickname, reason, exceptSocketId = "") {
  await deleteAccountSessions(accountNickname);
  const socketsToDisconnect = [];
  for (const [socketId, user] of users.entries()) {
    if (
      user.accountNickname !== accountNickname ||
      socketId === exceptSocketId
    ) {
      continue;
    }
    io.to(socketId).emit("sessions-revoked", { reason });
    socketsToDisconnect.push(socketId);
  }
  setTimeout(() => {
    for (const socketId of socketsToDisconnect) {
      io.sockets.sockets.get(socketId)?.disconnect(true);
    }
  }, 200);
}

function disconnectDeletedAccountLater(accountNickname) {
  setTimeout(() => {
    for (const [socketId, user] of users.entries()) {
      if (user.accountNickname !== accountNickname) continue;
      io.sockets.sockets.get(socketId)?.disconnect(true);
    }
  }, 150);
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
      sendRoomHistory(targetSocket, user, "accueil");
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

async function sendSecurityEvents(socket) {
  socket.emit("security-events", await listSecurityEvents(100));
}

async function recordSecurityEvent(eventType, identityHash, details) {
  await saveSecurityEvent({
    id: crypto.randomUUID(),
    eventType: String(eventType || "security_event").slice(0, 40),
    identityHash: String(identityHash || "unknown").slice(0, 32),
    details: String(details || "").slice(0, 180),
    createdAt: Date.now(),
  });

  const events = await listSecurityEvents(100);
  for (const [socketId, user] of users.entries()) {
    if (user.role === "admin") {
      io.to(socketId).emit("security-events", events);
    }
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

function emitModerationFeedback(socket, text, privateContext = false) {
  if (privateContext) {
    emitPrivateError(socket, text);
  } else {
    emitPrivateSystem(socket, text);
  }
}

function buildActiveMuteMessage(expiresAt, reason) {
  const remaining = Math.max(1, Number(expiresAt) - Date.now());
  return (
    `Tu es temporairement muet encore ${formatModerationDuration(remaining)}.` +
    ` Motif : ${reason || "moderation automatique"}.`
  );
}

async function ensureUserCanSpeak(socket, user, privateContext = false) {
  if (MODERATION_ROLES.has(user.role)) return true;

  const now = Date.now();
  if (!user.mutedUntil || user.mutedUntil <= now) {
    if (user.mutedUntil) {
      await clearTemporaryMute(user.moderationSubjectKey);
      user.mutedUntil = 0;
      user.muteReason = "";
      user.cooldownUntil = 0;
      publishUsers(user.room);
    }
    return true;
  }

  emitModerationFeedback(
    socket,
    buildActiveMuteMessage(user.mutedUntil, user.muteReason),
    privateContext
  );
  return false;
}

function getAutomaticModerationState(subjectKey) {
  const now = Date.now();
  let state = automaticModerationStates.get(subjectKey);
  if (!state) {
    state = { violationTimes: [] };
    automaticModerationStates.set(subjectKey, state);
  }
  state.violationTimes = state.violationTimes.filter(
    (violationAt) => now - violationAt < AUTOMATIC_VIOLATION_WINDOW_MS
  );
  return state;
}

async function handleAutomaticViolation(
  socket,
  user,
  {
    reason,
    fallbackMessage,
    severe = false,
    excerpt = "",
    privateContext = false,
  }
) {
  if (!AUTOMATIC_MODERATION_ENABLED || MODERATION_ROLES.has(user.role)) {
    emitModerationFeedback(socket, fallbackMessage, privateContext);
    return;
  }

  const state = getAutomaticModerationState(user.moderationSubjectKey);
  state.violationTimes.push(Date.now());
  const violationCount = state.violationTimes.length;

  if (!severe && violationCount < 2) {
    emitModerationFeedback(
      socket,
      `${fallbackMessage} Avertissement : une nouvelle infraction dans les 30 minutes entrainera un mute temporaire.`,
      privateContext
    );
    return;
  }

  const duration = getAutomaticMuteDuration(violationCount, severe);
  const expiresAt = Date.now() + duration;
  await saveTemporaryMute({
    subjectKey: user.moderationSubjectKey,
    displayName: user.nickname,
    reason,
    mutedBy: "Moderation automatique",
    expiresAt,
    createdAt: Date.now(),
  });

  const affectedRooms = new Set();
  for (const connectedUser of users.values()) {
    if (
      connectedUser.moderationSubjectKey !== user.moderationSubjectKey ||
      MODERATION_ROLES.has(connectedUser.role)
    ) {
      continue;
    }
    connectedUser.mutedUntil = expiresAt;
    connectedUser.muteReason = reason;
    connectedUser.cooldownUntil = expiresAt;
    connectedUser.messageTimes = [];
    clearUserTyping(connectedUser);
    affectedRooms.add(connectedUser.room);
  }
  for (const room of affectedRooms) publishUsers(room);

  await recordModerationAction(
    { nickname: "Moderation automatique", role: "system" },
    "auto_mute",
    user.nickname,
    `${reason} - ${formatModerationDuration(duration)}`
  );

  queueModerationAlert({
    key: `auto-mute:${user.moderationSubjectKey}`,
    subject: `Mute automatique : ${user.nickname}`,
    textContent:
      `Tchatelia a applique un mute temporaire a ${user.nickname}.\n\n` +
      `Motif : ${reason}\n` +
      `Duree : ${formatModerationDuration(duration)}\n` +
      `Salon : #${user.room}\n` +
      `Extrait : ${String(excerpt || "").slice(0, 240)}\n\n` +
      `Ouvre le centre de moderation : ${PUBLIC_URL || "Tchatelia"}`,
  });

  emitModerationFeedback(
    socket,
    `Moderation automatique : tu es muet pendant ${formatModerationDuration(duration)}. Motif : ${reason}.`,
    privateContext
  );
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
      violation: false,
      message: `Anti-spam : attends encore ${seconds}s avant de reparler.`,
    };
  }

  const normalizedMessage = messageText.toLocaleLowerCase("fr-FR");
  if (normalizedMessage === user.lastMessage) {
    user.cooldownUntil = now + DUPLICATE_COOLDOWN_MS;
    return {
      ok: false,
      violation: true,
      reason: "Message identique repete",
      message: "Anti-spam : evite d'envoyer deux fois le meme message.",
    };
  }

  user.messageTimes = user.messageTimes.filter((sentAt) => now - sentAt < SPAM_WINDOW_MS);

  if (user.messageTimes.length >= SPAM_MAX_MESSAGES) {
    user.cooldownUntil = now + SPAM_COOLDOWN_MS;
    user.messageTimes = [];
    return {
      ok: false,
      violation: true,
      reason: "Rafale de messages",
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

  if (action === "unmute" && !findUserByNickname(targetName)) {
    const account = await getAccountByNickname(normalizedTarget);
    const subjectKey = account ? `account:${account.nickname}` : "";
    const activeMute = subjectKey
      ? await getActiveTemporaryMute(subjectKey)
      : null;
    if (!activeMute) {
      emitPrivateSystem(socket, `${targetName} n'est pas connecte ou n'est pas muet.`);
      return;
    }

    await clearTemporaryMute(subjectKey);
    automaticModerationStates.delete(subjectKey);
    emitPrivateSystem(socket, `Mute retire pour ${account.displayName}.`);
    await recordModerationAction(
      admin,
      "unmute",
      account.displayName,
      "Mute temporaire retire hors connexion"
    );
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

  if (action === "unmute") {
    if (!targetUser.mutedUntil || targetUser.mutedUntil <= Date.now()) {
      emitPrivateSystem(socket, `${targetUser.nickname} n'est pas muet.`);
      return;
    }

    await clearTemporaryMute(targetUser.moderationSubjectKey);
    automaticModerationStates.delete(targetUser.moderationSubjectKey);
    const affectedRooms = new Set();
    for (const connectedUser of users.values()) {
      if (connectedUser.moderationSubjectKey !== targetUser.moderationSubjectKey) continue;
      connectedUser.mutedUntil = 0;
      connectedUser.muteReason = "";
      connectedUser.cooldownUntil = 0;
      connectedUser.messageTimes = [];
      affectedRooms.add(connectedUser.room);
    }
    for (const room of affectedRooms) publishUsers(room);
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
      emitPrivateSystem(
        targetSocket,
        `${admin.nickname} a retire ton mute temporaire.`
      );
    }
    emitPrivateSystem(socket, `Mute retire pour ${targetUser.nickname}.`);
    await recordModerationAction(
      admin,
      "unmute",
      targetUser.nickname,
      `Mute temporaire retire dans #${targetUser.room}`
    );
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

async function addMessage(room, message, senderSocketId = "") {
  const currentRoom = rooms.get(room);
  currentRoom.history.push(message);
  currentRoom.history = limitRoomHistory(currentRoom.history, MAX_HISTORY);
  await saveMessage(room, message);
  await trimRoomHistory(room);
  emitMessageToRoom("message", room, message);
  if (message.type !== "system") {
    publishRoomActivity(room, message, senderSocketId);
  }
}

function limitRoomHistory(history, limit) {
  if (history.length <= limit) return history;
  const pinnedMessage = history.find((message) => message.pinnedAt && !message.deletedAt);
  const latestMessages = history.slice(-limit);
  if (!pinnedMessage || latestMessages.some((message) => message.id === pinnedMessage.id)) {
    return latestMessages;
  }
  return [pinnedMessage, ...history.slice(-(limit - 1))].sort(
    (first, second) => Number(first.createdAt) - Number(second.createdAt)
  );
}

function sendRoomHistory(socket, user, room) {
  socket?.emit(
    "history",
    rooms
      .get(room)
      .history.map((message) => serializeMessageForUser(message, user, room))
      .filter(Boolean)
  );
}

function emitMessageToRoom(eventName, room, message) {
  for (const [socketId, user] of users.entries()) {
    if (user.room !== room) continue;
    const serializedMessage = serializeMessageForUser(message, user, room);
    if (serializedMessage) {
      io.to(socketId).emit(eventName, serializedMessage);
    }
  }
}

function serializeMessageForUser(message, user, room) {
  if (shouldHideMessageFromUser(message, user)) return null;

  const deletedAt = Number(message.deletedAt) || null;
  const authorAccountNickname = getMessageAuthorAccountNickname(message);
  const blockedByMe = Boolean(
    authorAccountNickname &&
      user?.blockedAccountNicknames?.has(authorAccountNickname)
  );
  const isOwner =
    Boolean(message.authorId) &&
    Boolean(user?.messageAuthorId) &&
    message.authorId === user.messageAuthorId;
  const canModerate = Boolean(user && MODERATION_ROLES.has(user.role));
  const canManage = message.type !== "system" && !deletedAt;
  const canBlock = Boolean(
    canManage &&
      user?.accountNickname &&
      authorAccountNickname &&
      user.accountNickname !== authorAccountNickname
  );
  const repliedMessage = message.replyToId
    ? rooms.get(room)?.history.find(
        (candidate) => candidate.id === message.replyToId
      )
    : null;
  const hideReply = Boolean(
    repliedMessage && shouldHideMessageFromUser(repliedMessage, user)
  );
  const reactionData = deletedAt ? {} : parseReactionData(message.reactionData);
  const reactions = [...MESSAGE_REACTIONS.entries()]
    .map(([key, emoji]) => {
      const accountIds = reactionData[key] || [];
      return {
        key,
        emoji,
        count: accountIds.length,
        reactedByMe: Boolean(
          user?.accountNickname && accountIds.includes(user.messageAuthorId)
        ),
      };
    })
    .filter((reaction) => reaction.count > 0);

  return {
    id: message.id,
    type: message.type,
    nickname: message.nickname,
    gender: normalizeGender(message.gender),
    role: MODERATION_ROLES.has(message.role) ? message.role : "user",
    text: deletedAt ? "" : message.text,
    authorAccountNickname,
    replyToId: hideReply ? "" : message.replyToId || "",
    replyToNickname: hideReply ? "" : message.replyToNickname || "",
    replyToText:
      hideReply || message.replyToDeleted ? "" : message.replyToText || "",
    replyToDeleted: hideReply || Boolean(message.replyToDeleted),
    editedAt: Number(message.editedAt) || null,
    deletedAt,
    deletedBy: message.deletedBy || "",
    pinnedAt: deletedAt ? null : Number(message.pinnedAt) || null,
    pinnedBy: deletedAt ? "" : message.pinnedBy || "",
    createdAt: Number(message.createdAt),
    canEdit: canManage && isOwner,
    canDelete: canManage && (isOwner || canModerate),
    canReact: canManage && Boolean(user?.accountNickname),
    canFavorite: canManage && Boolean(user?.accountNickname),
    canBlock,
    blockedByMe,
    isFavorite: canManage && Boolean(user?.favoriteMessageIds?.has(message.id)),
    canPin: canManage && canModerate,
    reactions,
  };
}

function parseReactionData(value) {
  let parsed = {};
  try {
    parsed = typeof value === "string" ? JSON.parse(value || "{}") : value || {};
  } catch {
    parsed = {};
  }

  const result = {};
  for (const key of MESSAGE_REACTIONS.keys()) {
    if (!Array.isArray(parsed[key])) continue;
    const accountIds = [
      ...new Set(
        parsed[key]
          .map((accountId) => String(accountId || ""))
          .filter((accountId) => accountId.startsWith("account:"))
      ),
    ].slice(0, 500);
    if (accountIds.length) result[key] = accountIds;
  }
  return result;
}

function removeAccountReactionsFromRooms(accountNickname) {
  const accountId = `account:${accountNickname}`;
  for (const [roomName, room] of rooms.entries()) {
    for (const message of room.history) {
      const reactionData = parseReactionData(message.reactionData);
      let changed = false;
      for (const key of Object.keys(reactionData)) {
        const filtered = reactionData[key].filter((value) => value !== accountId);
        if (filtered.length === reactionData[key].length) continue;
        changed = true;
        if (filtered.length) {
          reactionData[key] = filtered;
        } else {
          delete reactionData[key];
        }
      }
      if (!changed) continue;
      message.reactionData = JSON.stringify(reactionData);
      emitMessageToRoom("message-updated", roomName, message);
    }
  }
}

function setUserTyping(user, active) {
  if (user.typingTimeout) {
    clearTimeout(user.typingTimeout);
    user.typingTimeout = null;
  }

  const changed = user.isTyping !== active;
  user.isTyping = active;

  if (active) {
    user.typingTimeout = setTimeout(() => {
      user.isTyping = false;
      user.typingTimeout = null;
      publishTyping(user.room);
    }, 5_000);
  }

  if (changed) publishTyping(user.room);
}

function clearUserTyping(user, shouldPublish = true) {
  if (user.typingTimeout) {
    clearTimeout(user.typingTimeout);
    user.typingTimeout = null;
  }

  const changed = user.isTyping;
  user.isTyping = false;
  if (changed && shouldPublish) publishTyping(user.room);
}

function publishTyping(room) {
  const typingUsers = [...users.values()].filter(
    (user) => user.room === room && user.isTyping
  );

  for (const [socketId, viewer] of users.entries()) {
    if (viewer.room !== room) continue;
    const nicknames = typingUsers
      .filter(
        (typingUser) =>
          !shouldHideAccountContentFromUser(
            typingUser.accountNickname,
            viewer
          )
      )
      .map((typingUser) => typingUser.nickname);
    io.to(socketId).emit("typing-users", { room, nicknames });
  }
}

function publishRoomActivity(room, message, senderSocketId) {
  const mentionedNames = new Set(
    [...String(message.text || "").matchAll(/@([\p{L}\p{N}_-]{1,18})/gu)].map(
      (match) => normalizeName(match[1])
    )
  );

  for (const [socketId, connectedUser] of users.entries()) {
    if (socketId === senderSocketId) continue;
    if (shouldHideMessageFromUser(message, connectedUser)) continue;

    const normalizedNickname = normalizeName(connectedUser.nickname);
    const mentioned =
      mentionedNames.has(normalizedNickname) ||
      (connectedUser.accountNickname &&
        mentionedNames.has(normalizeName(connectedUser.accountNickname)));

    io.to(socketId).emit("room-activity", {
      id: message.id,
      room,
      nickname: message.nickname,
      text: message.text.slice(0, 160),
      createdAt: message.createdAt,
      mentioned,
    });
  }
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

function publishUsers() {
  const connected = [...users.values()]
    .map((user) => ({
      nickname: user.nickname,
      role: user.role,
      gender: normalizeGender(user.gender),
      account: user.account,
      room: user.room,
      mutedUntil:
        !MODERATION_ROLES.has(user.role) && user.mutedUntil > Date.now()
          ? user.mutedUntil
          : 0,
      presenceStatus: PRESENCE_STATUSES.has(user.presenceStatus)
        ? user.presenceStatus
        : "online",
      avatarUrl:
        user.avatarUrl && user.accountNickname
          ? `/avatar/${encodeURIComponent(user.accountNickname)}`
          : "",
    }))
    .sort((a, b) => a.nickname.localeCompare(b.nickname));

  io.emit("users", connected);
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
