export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

const COMMON_PASSWORDS = new Set([
  "123456789012",
  "azertyuiop12",
  "motdepasse12",
  "password1234",
  "tchatelia123",
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
