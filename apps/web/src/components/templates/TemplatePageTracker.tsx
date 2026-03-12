"use client";

import { useEffect } from "react";
import { trackTemplatePageViewed } from "@/lib/analytics";

export function TemplatePageTracker({
  type,
  jurisdiction,
}: {
  type: string;
  jurisdiction?: string;
}) {
  useEffect(() => {
    trackTemplatePageViewed(type, jurisdiction);
  }, [type, jurisdiction]);

  return null;
}
