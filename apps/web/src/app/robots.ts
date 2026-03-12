import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/templates/",
          "/for/",
          "/solutions/",
          "/pricing",
          "/contact",
          "/privacy",
          "/terms",
          "/about",
          "/docs",
        ],
        disallow: [
          "/dashboard/",
          "/my-templates/",
          "/contracts/",
          "/settings/",
          "/invoices/",
          "/signatures/",
          "/payments/",
          "/activity/",
          "/api/",
          "/auth/",
          "/login",
          "/register",
          "/sign/",
          "/pay/",
          "/portal/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
