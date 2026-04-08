"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ShieldAlert, Trash2 } from "lucide-react"

export function AdminPanel({ onReset }: { onReset: () => void }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPanel, setShowPanel] = useState(false)

  async function handleReset() {
    if (!password) {
      setError("Enter admin password")
      return
    }

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Reset failed")
        return
      }

      setOpen(false)
      setPassword("")
      onReset()
    } catch {
      setError("Connection error")
    } finally {
      setLoading(false)
    }
  }

  if (!showPanel) {
    return (
      <div className="px-4 py-3 border-t border-border">
        <button
          onClick={() => setShowPanel(true)}
          className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          Admin
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 py-3 border-t border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Admin</span>
        </div>

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-reject border-reject/30 hover:bg-reject/10 hover:text-reject gap-1.5"
            >
              <Trash2 className="h-3 w-3" />
              Reset All Votes
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all votes?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete ALL votes from ALL users. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-1.5 py-2">
              <label className="text-sm font-medium text-foreground">
                Admin Password
              </label>
              <Input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && (
                <p className="text-xs text-reject">{error}</p>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setPassword(""); setError("") }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault()
                  handleReset()
                }}
                disabled={loading}
                className="bg-reject text-reject-foreground hover:bg-reject/90"
              >
                {loading ? "Resetting..." : "Delete Everything"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
