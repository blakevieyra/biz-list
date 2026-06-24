const HATE_PATTERNS = [
  /\b(kill|death to)\s+(all\s+)?(the\s+)?(jews|muslims|blacks|whites|gays|trans)\b/i,
  /\b(nigg[ae]r|fagg?ot|kike|spic|chink|wetback)\b/i,
  /\b(heil|white power|white supremac)\b/i,
];

const SPAM_PATTERNS = [
  /(.)\1{8,}/,
  /\b(buy now|click here|free money|crypto giveaway|work from home)\b.*\b(http|www\.)/i,
  /(http[s]?:\/\/[^\s]+){4,}/i,
];

export type ModerationResult =
  | { ok: true }
  | { ok: false; reason: string };

export function moderateUserContent(text: string, label = "Content"): ModerationResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, reason: `${label} cannot be empty.` };
  }

  if (trimmed.length > 5000) {
    return { ok: false, reason: `${label} is too long.` };
  }

  for (const pattern of HATE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        ok: false,
        reason: `${label} was blocked because it may contain hate speech. Please revise and try again.`,
      };
    }
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        ok: false,
        reason: `${label} looks like spam. Remove promotional links or repetitive text.`,
      };
    }
  }

  return { ok: true };
}

export function moderateMultiple(fields: Record<string, string>): ModerationResult {
  for (const [label, text] of Object.entries(fields)) {
    if (!text.trim()) continue;
    const result = moderateUserContent(text, label);
    if (!result.ok) return result;
  }
  return { ok: true };
}
