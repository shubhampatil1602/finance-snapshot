/** Site-wide facts used by metadata, the sitemap, robots.txt and the public pages. */

const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL

export const site = {
  name: "Finance Snapshot",
  shortName: "Snapshot",
  tagline: "How much can I still spend this month?",
  description:
    "Finance Snapshot answers one question at a glance: how much can I still spend this month? Track income, bills, subscriptions, EMIs and savings goals in one place.",
  /** Canonical origin, no trailing slash. Set NEXT_PUBLIC_SITE_URL in production; Vercel's production domain is the fallback. */
  url: (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (vercelProductionUrl ? `https://${vercelProductionUrl}` : "http://localhost:3000")
  ).replace(/\/+$/, ""),
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "shubhamspatilnbr@gmail.com",
  /** Bump when the Terms or Privacy Policy change. Also used as the sitemap's lastModified. */
  legalUpdated: "2026-11-12",
} as const

/** Pages anyone can open without signing in. They are indexable and listed in the sitemap. */
export const PUBLIC_PAGES = [
  { path: "/about", label: "About", changeFrequency: "monthly", priority: 0.8 },
  { path: "/faq", label: "FAQ", changeFrequency: "monthly", priority: 0.7 },
  { path: "/contact", label: "Contact", changeFrequency: "yearly", priority: 0.5 },
  { path: "/privacy", label: "Privacy Policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", label: "Terms & Conditions", changeFrequency: "yearly", priority: 0.3 },
] as const

/** Routes the proxy lets through without a session cookie. */
export const UNAUTHENTICATED_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  ...PUBLIC_PAGES.map((p) => p.path),
]
