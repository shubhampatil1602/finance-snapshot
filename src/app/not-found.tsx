import type { Metadata } from "next"
import Link from "next/link"
import { SearchXIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export const metadata: Metadata = { title: "Page not found" }

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle>Page not found</EmptyTitle>
          <EmptyDescription>That page doesn&apos;t exist or has moved.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center gap-2">
          <Button render={<Link href="/" />} nativeButton={false}>
            Go to dashboard
          </Button>
          <Button variant="outline" render={<Link href="/faq" />} nativeButton={false}>
            Read the FAQ
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
