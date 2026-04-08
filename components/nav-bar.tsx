"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Heart, BarChart3, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function NavBar({ voterName }: { voterName?: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/")
  }

  return (
    <nav className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
      <div className="flex items-center gap-1">
        <Heart className="h-4 w-4 text-gold" />
        <span className="text-sm font-serif font-semibold text-foreground">
          Wedding Photos
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Link href="/swipe">
          <Button
            variant={pathname === "/swipe" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "text-xs gap-1.5",
              pathname === "/swipe" && "bg-secondary text-secondary-foreground"
            )}
          >
            <Heart className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Swipe</span>
          </Button>
        </Link>
        <Link href="/results">
          <Button
            variant={pathname === "/results" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "text-xs gap-1.5",
              pathname === "/results" && "bg-secondary text-secondary-foreground"
            )}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Results</span>
          </Button>
        </Link>
        <div className="w-px h-5 bg-border mx-1" />
        {voterName && (
          <span className="text-xs text-muted-foreground hidden sm:inline mr-1">
            {voterName}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="sr-only">Log out</span>
        </Button>
      </div>
    </nav>
  )
}
