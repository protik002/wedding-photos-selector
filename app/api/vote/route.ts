import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getVoterFromSession } from "@/lib/session"

export async function POST(request: NextRequest) {
  try {
    const voter = await getVoterFromSession()
    if (!voter) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { photoId, photoFilename, direction } = await request.json()

    if (!photoId || typeof photoId !== "string") {
      return NextResponse.json({ error: "photoId required" }, { status: 400 })
    }
    if (direction !== 1 && direction !== -1) {
      return NextResponse.json({ error: "direction must be 1 or -1" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase.from("votes").upsert(
      {
        voter_id: voter.id,
        photo_id: photoId,
        photo_filename: photoFilename || "",
        direction,
      },
      { onConflict: "voter_id,photo_id" }
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

    const { photoId } = await request.json()

    if (!photoId) {
      return NextResponse.json({ error: "photoId required" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("voter_id", voter.id)
      .eq("photo_id", photoId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Undo vote error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
