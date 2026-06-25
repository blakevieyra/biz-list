/** Validate that an attachment URL came from our Supabase storage bucket for this user. */
export function isAllowedCommentAttachmentUrl(url: string, userId: string): boolean {
  if (!url || url.length > 2000) return false;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;

  try {
    const parsed = new URL(url);
    const expectedHost = new URL(supabaseUrl).host;
    if (parsed.host !== expectedHost) return false;
    if (!parsed.pathname.includes("/storage/v1/object/public/business-media/")) return false;
    if (!parsed.pathname.includes(`/${userId}/comments/`)) return false;
    return true;
  } catch {
    return false;
  }
}
