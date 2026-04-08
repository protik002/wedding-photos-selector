import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getVoterFromSession } from "@/lib/session"

// Get current user's voted photo IDs (for resuming)
export async function GET() {
  try {
    const voter = await getVoterFromSession()
    if (!voter) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("votes")
      .select("photo_id")
      .eq("voter_id", voter.id)

    if (error) throw error

    const votedPhotoIds = (data || []).map((v) => v.photo_id)

    return NextResponse.json({ votedPhotoIds })
  } catch (err) {
    console.error("Votes fetch error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
