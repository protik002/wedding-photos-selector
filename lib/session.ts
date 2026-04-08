import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

const SESSION_COOKIE = "wedding_session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  })
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE)?.value ?? null
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
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
  return data as { id: string; name: string; location: string; session_token: string }
}

export function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("")
}
