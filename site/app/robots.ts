import type { MetadataRoute } from "next";
import { SITE_URL } from "./lib/server";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/espace-recruteur"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
