export const AUTOMATIC_MUTE_DURATIONS_MS = [
  2 * 60_000,
  10 * 60_000,
  30 * 60_000,
  60 * 60_000,
];

export function normalizeModerationText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function parseModerationTerms(value) {
  return [
    ...new Set(
      String(value || "")
        .split(/[\n,;]+/)
        .map(normalizeModerationText)
        .filter((term) => term.length >= 3)
    ),
  ];
}

export function findBlockedTerm(message, terms) {
  const normalizedMessage = normalizeModerationText(message);
  if (!normalizedMessage) return "";

  const searchableMessage = ` ${normalizedMessage} `;
  return (
    terms.find((term) => searchableMessage.includes(` ${term} `)) || ""
  );
}

export function getAutomaticMuteDuration(violationCount, severe = false) {
  const effectiveCount = severe
    ? Math.max(3, Number(violationCount) || 0)
    : Number(violationCount) || 0;
  const durationIndex = Math.max(
    0,
    Math.min(AUTOMATIC_MUTE_DURATIONS_MS.length - 1, effectiveCount - 2)
  );
  return AUTOMATIC_MUTE_DURATIONS_MS[durationIndex];
}

export function classifyModerationIncident({ severe = false, muted = false } = {}) {
  if (severe) {
    return { severity: "critical", automaticAction: "auto_mute" };
  }
  if (muted) {
    return { severity: "intervention", automaticAction: "auto_mute" };
  }
  return { severity: "watch", automaticAction: "warning" };
}

export function formatModerationDuration(durationMs) {
  const totalSeconds = Math.max(1, Math.ceil(Number(durationMs) / 1000));
  if (totalSeconds < 60) return `${totalSeconds} seconde${totalSeconds > 1 ? "s" : ""}`;

  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes > 1 ? "s" : ""}`;

  const totalHours = Math.ceil(totalMinutes / 60);
  return `${totalHours} heure${totalHours > 1 ? "s" : ""}`;
}
