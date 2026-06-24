const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmailInput(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmailInput(email);
  if (!normalized || normalized.includes(",") || normalized.includes(" ")) {
    return false;
  }
  return EMAIL_PATTERN.test(normalized);
}

export function getEmailError(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required.";
  if (trimmed.includes(",") || trimmed.includes(" ")) {
    return "Email cannot contain commas or spaces. Use name@gmail.com format.";
  }
  if (!trimmed.includes("@")) return "Include an @ symbol, like name@gmail.com.";
  if (!isValidEmail(trimmed)) return "Enter a valid email address.";
  return null;
}

export function getPasswordError(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export function getDisplayNameError(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Display name is required.";
  if (trimmed.length < 2) return "Display name must be at least 2 characters.";
  return null;
}
