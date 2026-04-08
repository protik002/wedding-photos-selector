import { NextResponse } from "next/server"
import { getVoterFromSession } from "@/lib/session"

export async function GET() {
  try {
    const voter = await getVoterFromSession()
    if (!voter) {
      return NextResponse.json({ voter: null }, { status: 401 })
    }
    return NextResponse.json({
      voter: { id: voter.id, name: voter.name, location: voter.location },
    })
  } catch {
    return NextResponse.json({ voter: null }, { status: 401 })
  }
}
