import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getVoterFromSession } from "@/lib/session"

export async function POST(request: NextRequest) {
  try {
    const voter = await getVoterFromSession()
    if (!voter) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { photoFilename, direction } = await request.json()

    if (!photoFilename || typeof photoFilename !== "string") {
      return NextResponse.json({ error: "photoFilename required" }, { status: 400 })
    }
    if (direction !== 1 && direction !== -1) {
      return NextResponse.json({ error: "direction must be 1 or -1" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Use photo_filename as the unique key (matches DB schema)
    const { error } = await supabase.from("votes").upsert(
      {
        voter_id: voter.id,
        photo_filename: photoFilename,
        direction,
      },
      { onConflict: "voter_id,photo_filename" }
    )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Vote error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const voter = await getVoterFromSession()
    if (!voter) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { photoFilename } = await request.json()

    if (!photoFilename) {
      return NextResponse.json({ error: "photoFilename required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("voter_id", voter.id)
      .eq("photo_filename", photoFilename)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Undo vote error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
