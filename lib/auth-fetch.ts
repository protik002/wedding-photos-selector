// Helper for authenticated API calls
// Uses session token from sessionStorage (for iframe preview compatibility)

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null
  return sessionStorage.getItem("wedding_session")
}

export function clearSession() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("wedding_session")
  }
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getSessionToken()
  
  const headers = new Headers(options.headers)
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }
  
  return fetch(url, {
    ...options,
    headers,
  })
}
