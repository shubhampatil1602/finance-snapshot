"use client"

import "./globals.css"

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-svh items-center justify-center bg-background p-6 font-sans text-foreground">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">The app hit an unexpected error. Your data is safe.</p>
          <button className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground" onClick={() => retry()}>
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
