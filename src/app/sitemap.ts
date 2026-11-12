import type { MetadataRoute } from "next"
import { PUBLIC_PAGES, site } from "@/lib/site"

/** Served at /sitemap.xml. Only public pages; everything else needs an account. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(site.legalUpdated)
  return PUBLIC_PAGES.map((page) => ({
    url: `${site.url}${page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))
}
