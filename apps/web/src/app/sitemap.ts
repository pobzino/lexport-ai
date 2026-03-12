import { MetadataRoute } from "next";
import {
  getValidContractTypes,
  getValidJurisdictions,
  typeEnumToSlug,
  jurisdictionEnumToSlug,
} from "@/lib/templates/slugs";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com";

  // Static marketing pages
  const staticRoutes = [
    "",
    "/about",
    "/contact",
    "/docs",
    "/privacy",
    "/terms",
    "/solutions/contracts",
    "/solutions/signatures",
    "/solutions/invoicing",
    "/for/freelancers",
    "/for/contractors",
    "/for/founders",
    "/for/business-owners",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  // Template hub page
  const templateHub = {
    url: `${baseUrl}/templates`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  };

  // Template type pages
  const types = getValidContractTypes();
  const jurisdictions = getValidJurisdictions();

  const typePages = types.map((type) => ({
    url: `${baseUrl}/templates/${typeEnumToSlug(type)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Template type + jurisdiction pages
  const jurisdictionPages = types.flatMap((type) =>
    jurisdictions.map((j) => ({
      url: `${baseUrl}/templates/${typeEnumToSlug(type)}/${jurisdictionEnumToSlug(j)}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }))
  );

  return [...staticRoutes, templateHub, ...typePages, ...jurisdictionPages];
}
