import Link from "next/link"

export default function Header() {
  return (
    <header className="border-b">
      <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-2xl font-bold">
            D/L/:ATLAS
          </Link>
          <ul className="hidden md:flex space-x-6">
            <li>
              <Link href="/" className="hover:text-primary transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link href="/documentation" className="hover:text-primary transition-colors">
                Documentation
              </Link>
            </li>
            <li>
              <span className="text-muted-foreground cursor-not-allowed">Tools (Coming Soon)</span>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  )
}

