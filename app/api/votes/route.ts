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
      .select("photo_filename")
      .eq("voter_id", voter.id)

    if (error) throw error

    // Return filenames instead of IDs (DB uses photo_filename)
    const votedPhotoFilenames = (data || []).map((v) => v.photo_filename)

    return NextResponse.json({ votedPhotoFilenames })
  } catch (err) {
    console.error("Votes fetch error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
