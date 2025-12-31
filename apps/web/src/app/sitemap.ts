import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com";

    const routes = [
        "",
        "/contact",
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

    return routes;
}
