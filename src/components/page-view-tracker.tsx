"use client";

import { useEffect, useRef } from "react";
import { trackPageView } from "@/lib/actions/analytics";

export function PageViewTracker({ businessId }: { businessId: string }) {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackPageView(businessId).catch(() => {});
  }, [businessId]);

  return null;
}
