import { cookies, headers } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

const SESSION_COOKIE = "wedding_session"

export async function getSessionToken(): Promise<string | null> {
  // First check Authorization header (for iframe preview compatibility)
  const headerStore = await headers()
  const authHeader = headerStore.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7)
  }
  
  // Fallback to cookie (for production)
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE)?.value ?? null
}

export async function getVoterFromSession() {
  const token = await getSessionToken()
  if (!token) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("voters")
    .select("*")
    .eq("session_token", token)
    .single()

  if (error || !data) return null
  return data as { id: number; name: string; location: string; session_token: string }
}

export function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("")
}
