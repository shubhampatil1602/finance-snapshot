import type { Metadata, Viewport } from "next"
import { Google_Sans_Code, Google_Sans_Flex } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const googleSansFlex = Google_Sans_Flex({ variable: "--font-google-sans-flex", subsets: ["latin"] })
const googleSansCode = Google_Sans_Code({ variable: "--font-google-sans-code", subsets: ["latin"] })

export const metadata: Metadata = {
  title: { default: "Finance Snapshot", template: "%s · Finance Snapshot" },
  description: "How much can I still spend this month?",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9e4d8" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${googleSansFlex.variable} ${googleSansCode.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
