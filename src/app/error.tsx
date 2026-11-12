"use client"

import { useEffect } from "react"
import Link from "next/link"
import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

/** Catches errors on public and auth pages. The app has its own boundary in (app)/error.tsx. */
export default function RootError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription>
            This page hit an unexpected error. Your data is safe. Try again, or contact us if it keeps happening.
          </EmptyDescription>
          {error.digest && <p className="font-mono text-xs text-muted-foreground">Error ID: {error.digest}</p>}
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center gap-2">
          <Button onClick={() => retry()}>
            <RotateCcwIcon data-icon="inline-start" />
            Try again
          </Button>
          <Button variant="outline" render={<Link href="/contact" />} nativeButton={false}>
            Contact support
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  )
}
