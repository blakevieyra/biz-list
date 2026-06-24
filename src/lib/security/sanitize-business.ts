import type { BusinessService, BusinessSocialLinks } from "@/lib/types";
import { normalizeServiceType } from "@/lib/service-types";
import { getSafeExternalUrl } from "@/lib/security/safe-url";

export function sanitizeSocialLinks(links: BusinessSocialLinks | undefined): BusinessSocialLinks {
  if (!links) return {};
  const result: BusinessSocialLinks = {};
  for (const key of Object.keys(links) as (keyof BusinessSocialLinks)[]) {
    const url = getSafeExternalUrl(links[key]);
    if (url) result[key] = url;
  }
  return result;
}

function resolveActionType(service: BusinessService): "link" | "form" | undefined {
  if (service.actionType === "form") return "form";
  if (service.actionType === "link" || getSafeExternalUrl(service.actionUrl)) return "link";
  return undefined;
}

export function sanitizeServices(services: BusinessService[] | undefined, max = 20): BusinessService[] {
  if (!services?.length) return [];
  return services
    .filter((s) => s.name.trim())
    .slice(0, max)
    .map((s) => {
      const actionType = resolveActionType(s);
      const safeUrl = getSafeExternalUrl(s.actionUrl);
      const serviceType = normalizeServiceType(s.serviceType);
      return {
        name: s.name.trim().slice(0, 120),
        description: s.description.trim().slice(0, 500),
        price: s.price?.trim().slice(0, 80),
        imageUrl: getSafeExternalUrl(s.imageUrl) ?? undefined,
        serviceType,
        actionType: actionType === "form" ? "form" : actionType === "link" ? "link" : undefined,
        actionUrl: actionType === "link" ? safeUrl ?? undefined : undefined,
        actionLabel: s.actionLabel?.trim().slice(0, 40) || undefined,
      };
    });
}
