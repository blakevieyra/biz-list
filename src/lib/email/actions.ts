import { createClient } from "@/lib/supabase/server";
import { sendTemplateEmail } from "./send";
import { emailTemplates } from "./templates";

async function getProfileEmail(userId: string) {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("profiles")
    .select("email, display_name")
    .eq("id", userId)
    .single();

  return data;
}

export async function emailSignupVerification(
  to: string,
  name: string,
  verifyUrl: string,
) {
  await sendTemplateEmail(to, emailTemplates.emailVerification(name, verifyUrl));
}

export async function emailWelcome(to: string, name: string) {
  await sendTemplateEmail(to, emailTemplates.welcome(name));
}

export async function emailFirstLogin(to: string, name: string) {
  await sendTemplateEmail(to, emailTemplates.firstLogin(name));
}

export async function emailProfileComplete(to: string, name: string) {
  await sendTemplateEmail(to, emailTemplates.profileComplete(name));
}

export async function emailProUpgrade(to: string, name: string, tier = "Pro") {
  await sendTemplateEmail(to, emailTemplates.proUpgrade(name, tier));
}

export async function emailAssessmentComplete(to: string, name: string, score: number) {
  await sendTemplateEmail(to, emailTemplates.assessmentComplete(name, score));
}

export async function emailForumPostPublished(
  to: string,
  name: string,
  postTitle: string,
  link: string,
) {
  await sendTemplateEmail(to, emailTemplates.forumPost(name, postTitle, link));
}

export async function emailCollaborationPublished(to: string, name: string, title: string) {
  await sendTemplateEmail(to, emailTemplates.collaboration(name, title));
}

export async function emailNotificationToUser(
  userId: string,
  type: "follow" | "connection" | "comment" | "message",
  params: {
    actorName: string;
    businessName?: string;
    postTitle?: string;
    link: string;
  },
) {
  const profile = await getProfileEmail(userId);
  if (!profile?.email) return;

  const name = profile.display_name || "there";

  if (type === "follow" && params.businessName) {
    await sendTemplateEmail(
      profile.email,
      emailTemplates.follow(name, params.actorName, params.businessName, params.link),
    );
  }

  if (type === "connection" && params.businessName) {
    await sendTemplateEmail(
      profile.email,
      emailTemplates.connection(name, params.actorName, params.businessName, params.link),
    );
  }

  if (type === "comment" && params.postTitle) {
    await sendTemplateEmail(
      profile.email,
      emailTemplates.comment(name, params.actorName, params.postTitle, params.link),
    );
  }

  if (type === "message") {
    await sendTemplateEmail(
      profile.email,
      emailTemplates.message(name, params.actorName, params.link),
    );
  }
}

export async function emailFollowDigest(
  to: string,
  name: string,
  frequency: "daily" | "weekly" | "monthly",
  lines: string[],
) {
  const summary =
    lines.length > 0
      ? lines.join("\n\n")
      : "No new posts from businesses you follow in this period. Browse Listings to discover more local businesses.";
  await sendTemplateEmail(to, emailTemplates.followDigest(name, frequency, summary));
}

export async function emailServiceOrderToBusiness(
  to: string,
  ownerName: string,
  customerName: string,
  businessName: string,
  serviceName: string,
  message: string,
  quantity: string,
) {
  const details = [
    quantity ? `Quantity / size: ${quantity}` : null,
    `Notes: ${message}`,
  ]
    .filter(Boolean)
    .join("\n");

  await sendTemplateEmail(
    to,
    emailTemplates.serviceOrderToBusiness(
      ownerName,
      customerName,
      businessName,
      serviceName,
      details,
      "/dashboard/orders",
    ),
  );
}

export async function emailServiceOrderConfirmation(
  to: string,
  customerName: string,
  businessName: string,
  serviceName: string,
  message: string,
  quantity: string,
  listingLink: string,
) {
  const details = [
    quantity ? `Quantity / size: ${quantity}` : null,
    `Your notes: ${message}`,
  ]
    .filter(Boolean)
    .join("\n");

  await sendTemplateEmail(
    to,
    emailTemplates.serviceOrderConfirmation(
      customerName,
      businessName,
      serviceName,
      details,
      listingLink,
    ),
  );
}
