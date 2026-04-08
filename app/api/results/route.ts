import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getVoterFromSession } from "@/lib/session"

export async function GET() {
  try {
    const voter = await getVoterFromSession()
    if (!voter) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: votes, error } = await supabase
      .from("votes")
      .select("photo_filename, direction")

    if (error) throw error

    // Aggregate by photo filename
    const photoMap: Record<
      string,
      { filename: string; score: number; totalVotes: number; keeps: number }
    > = {}

    for (const v of votes || []) {
      if (!photoMap[v.photo_filename]) {
        photoMap[v.photo_filename] = {
          filename: v.photo_filename,
          score: 0,
          totalVotes: 0,
          keeps: 0,
        }
      }
      photoMap[v.photo_filename].score += v.direction
      photoMap[v.photo_filename].totalVotes++
      if (v.direction === 1) photoMap[v.photo_filename].keeps++
    }

    const results = Object.values(photoMap)

    return NextResponse.json({ results })
  } catch (err) {
    console.error("Results error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
