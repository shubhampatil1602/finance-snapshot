import type { MetadataRoute } from "next"
import { site } from "@/lib/site"

/** Served at /robots.txt. Private app screens sit behind login and are kept out of indexes. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/about", "/faq", "/contact", "/privacy", "/terms"],
      disallow: ["/api/", "/transactions", "/recurring", "/goals", "/settings", "/guide", "/forgot-password"],
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  }
}
