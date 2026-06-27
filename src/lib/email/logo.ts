import fs from "node:fs";
import path from "node:path";

export const EMAIL_LOGO_CID = "bizlist-logo";

let cachedBase64: string | null = null;

export function getLogoBase64(): string {
  if (cachedBase64) return cachedBase64;

  const logoPath = path.join(process.cwd(), "public", "bizlist-logo.png");
  const buffer = fs.readFileSync(logoPath);
  cachedBase64 = buffer.toString("base64");
  return cachedBase64;
}

export function getLogoInlineAttachment() {
  return {
    content: getLogoBase64(),
    filename: "bizlist-logo.png",
    type: "image/png",
    disposition: "inline" as const,
    content_id: EMAIL_LOGO_CID,
  };
}
