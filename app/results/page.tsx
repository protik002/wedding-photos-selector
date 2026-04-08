"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { NavBar } from "@/components/nav-bar"
import { ResultsTable } from "@/components/results-table"
import { AdminPanel } from "@/components/admin-panel"

interface PhotoResult {
  id: string
  filename: string
  score: number
  totalVotes: number
  keeps: number
}

export default function ResultsPage() {
  const router = useRouter()
  const [voterName, setVoterName] = useState("")
  const [results, setResults] = useState<PhotoResult[]>([])
  const [loading, setLoading] = useState(true)

  const loadResults = useCallback(async () => {
    try {
      const res = await fetch("/api/results")
      if (res.ok) {
        const data = await res.json()
        setResults(data.results || [])
      }
    } catch {
      // Silent fail
    }
  }, [])

  useEffect(() => {
    async function init() {
      try {
        const authRes = await fetch("/api/auth/me")
        if (!authRes.ok) {
          router.push("/")
          return
        }
        const authData = await authRes.json()
        if (!authData.voter) {
          router.push("/")
          return
        }
        setVoterName(authData.voter.name)
        await loadResults()
      } catch {
        router.push("/")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router, loadResults])

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <NavBar voterName={voterName} />
      <main className="flex-1 w-full max-w-lg mx-auto">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-lg font-serif font-semibold text-foreground">
            Results
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            See which photos everyone loves most
          </p>
        </div>
        <ResultsTable results={results} />
        <AdminPanel
          onReset={() => {
            setResults([])
            loadResults()
          }}
        />
      </main>
    </div>
  )
}
