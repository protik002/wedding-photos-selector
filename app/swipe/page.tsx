"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { NavBar } from "@/components/nav-bar"
import { SwipeDeck } from "@/components/swipe-deck"

export default function SwipePage() {
  const router = useRouter()
  const [voterName, setVoterName] = useState("")
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me")
        if (!res.ok) {
          router.push("/")
          return
        }
        const data = await res.json()
        if (!data.voter) {
          router.push("/")
          return
        }
        setVoterName(data.voter.name)
      } catch {
        router.push("/")
      } finally {
        setChecking(false)
      }
    }
    checkSession()
  }, [router])

  if (checking) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <NavBar voterName={voterName} />
      <SwipeDeck />
    </div>
  )
}
