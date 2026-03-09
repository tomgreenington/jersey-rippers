import Link from 'next/link'

export function StoreFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Jersey Rippers. All rights reserved.
        </p>
        <nav className="flex gap-4">
          <Link
            href="/collections/singles"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Collections
          </Link>
          <Link
            href="/search"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Search
          </Link>
          <Link
            href="/spin"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Spin
          </Link>
        </nav>
      </div>
    </footer>
  )
}
