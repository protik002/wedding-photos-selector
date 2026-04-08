import { NextResponse } from "next/server"
import { getVoterFromSession, getSessionToken } from "@/lib/session"

export async function GET() {
  try {
    const token = await getSessionToken()
    console.log("[v0] /api/auth/me - session token present:", !!token, token ? `(${token.slice(0, 8)}...)` : "")
    
    const voter = await getVoterFromSession()
    console.log("[v0] /api/auth/me - voter found:", !!voter, voter ? `(id=${voter.id}, name=${voter.name})` : "")
    
    if (!voter) {
      return NextResponse.json({ voter: null }, { status: 401 })
    }
    return NextResponse.json({
      voter: { id: voter.id, name: voter.name, location: voter.location },
    })
  } catch (err) {
    console.error("[v0] /api/auth/me error:", err)
    return NextResponse.json({ voter: null }, { status: 401 })
  }
}
