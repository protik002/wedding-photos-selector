import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getVoterFromSession } from "@/lib/session"

export async function POST(request: NextRequest) {
  try {
    const voter = await getVoterFromSession()
    if (!voter) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { adminPassword } = await request.json()

    if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Incorrect admin password" }, { status: 403 })
    }

    const supabase = createAdminClient()

    // Delete all votes first (FK constraint)
    const { error: votesError } = await supabase
      .from("votes")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")

    if (votesError) throw votesError

    // Delete all voters
    const { error: votersError } = await supabase
      .from("voters")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")

    if (votersError) throw votersError

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Admin reset error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
