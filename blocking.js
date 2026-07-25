const MODERATION_ROLES = new Set(["admin", "moderator"]);

export function getMessageAuthorAccountNickname(message) {
  const authorId = String(message?.authorId || "");
  return authorId.startsWith("account:") ? authorId.slice("account:".length) : "";
}

export function shouldHideAccountContentFromUser(accountNickname, user) {
  if (!accountNickname || !user || MODERATION_ROLES.has(user.role)) return false;
  return Boolean(user.blockedAccountNicknames?.has(accountNickname));
}

export function shouldHideMessageFromUser(message, user) {
  if (!message || message.type === "system") return false;
  return shouldHideAccountContentFromUser(
    getMessageAuthorAccountNickname(message),
    user
  );
}
