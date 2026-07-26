export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789012",
  "azertyui",
  "azertyuiop12",
  "motdepasse",
  "motdepasse12",
  "password",
  "password1234",
  "tchatelia",
  "tchatelia123",
  "qwertyui",
  "qwertyuiop12",
]);

export function getNewPasswordError(password, identityValues = []) {
  const value = String(password || "");
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return `Le mot de passe ne doit pas depasser ${MAX_PASSWORD_LENGTH} caracteres.`;
  }

  const normalized = value.toLocaleLowerCase("fr-FR");
  if (COMMON_PASSWORDS.has(normalized) || new Set(normalized).size < 5) {
    return "Choisis un mot de passe moins previsible.";
  }

  const containsIdentity = identityValues
    .map((identity) =>
      String(identity || "")
        .trim()
        .toLocaleLowerCase("fr-FR")
    )
    .filter((identity) => identity.length >= 4)
    .some((identity) => normalized.includes(identity));
  if (containsIdentity) {
    return "Le mot de passe ne doit pas contenir ton pseudo ou ton adresse e-mail.";
  }

  return "";
}

export function isAllowedOrigin(originHeader, allowedOrigins) {
  const origin = String(originHeader || "").trim();
  if (!origin) return true;

  try {
    const parsedOrigin = new URL(origin);
    if (!["http:", "https:"].includes(parsedOrigin.protocol)) return false;
    return new Set(
      allowedOrigins
        .map((candidate) => {
          try {
            return new URL(candidate).origin;
          } catch {
            return "";
          }
        })
        .filter(Boolean)
    ).has(parsedOrigin.origin);
  } catch {
    return false;
  }
}

export function normalizeIpAddress(value) {
  let address = String(value || "").trim().toLocaleLowerCase("en-US");
  if (!address) return "";

  if (address.startsWith("[") && address.includes("]")) {
    address = address.slice(1, address.indexOf("]"));
  }
  if (address.startsWith("::ffff:")) {
    address = address.slice(7);
  }
  if (address === "::1") return "127.0.0.1";
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(address)) {
    address = address.slice(0, address.lastIndexOf(":"));
  }
  return address;
}

export function parseAllowedIpAddresses(value) {
  return [
    ...new Set(
      String(value || "")
        .split(",")
        .map(normalizeIpAddress)
        .filter(Boolean)
    ),
  ];
}

export function getForwardedClientIp(value) {
  return (
    String(value || "")
      .split(",")
      .map(normalizeIpAddress)
      .find(Boolean) || ""
  );
}

export function isIpAddressAllowed(value, allowedAddresses) {
  const allowed = Array.isArray(allowedAddresses)
    ? allowedAddresses
    : [...(allowedAddresses || [])];
  if (!allowed.length) return true;
  return allowed.includes(normalizeIpAddress(value));
}
