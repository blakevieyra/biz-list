import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function isProductionEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production"
  );
}

function getEncryptionKey(): Buffer {
  const secret =
    process.env.SIGNUP_VERIFICATION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    if (isProductionEnvironment()) {
      throw new Error("SIGNUP_VERIFICATION_SECRET is required in production.");
    }
    return createHash("sha256").update("BizList-dev-signup-secret").digest();
  }

  return createHash("sha256").update(secret).digest();
}

export function createVerificationToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  const hash = hashVerificationToken(token);
  return { token, hash };
}

export function createOtpCode(): { code: string; hash: string } {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const hash = hashVerificationToken(code);
  return { code, hash };
}

export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function encryptSignupPassword(password: string): {
  ciphertext: string;
  iv: string;
} {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([encrypted, tag]).toString("base64url"),
    iv: iv.toString("base64url"),
  };
}

export function decryptSignupPassword(ciphertext: string, iv: string): string {
  const ivBuf = Buffer.from(iv, "base64url");
  const data = Buffer.from(ciphertext, "base64url");
  const tag = data.subarray(data.length - 16);
  const enc = data.subarray(0, data.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), ivBuf);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
