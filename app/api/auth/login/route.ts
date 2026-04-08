import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateSessionToken } from "@/lib/session"

export async function POST(request: NextRequest) {
  try {
    const { name, location, password } = await request.json()

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (!password || password !== process.env.ACCESS_PASSWORD) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 })
    }

    const trimmedName = name.trim()
    const trimmedLocation = (location || "").trim()

    const supabase = createAdminClient()

    // Check if voter exists
    let voter = null
    const { data: existing } = await supabase
      .from("voters")
      .select("*")
      .eq("name", trimmedName)
      .eq("location", trimmedLocation)
      .limit(1)

    if (existing && existing.length > 0) {
      voter = existing[0]
    } else {
      // Create new voter
      const { data: newVoter, error } = await supabase
        .from("voters")
        .insert({ name: trimmedName, location: trimmedLocation })
        .select()
        .single()
      if (error) throw error
      voter = newVoter
    }

    // Generate session token and save it
    const sessionToken = generateSessionToken()
    const { error: updateError } = await supabase
      .from("voters")
      .update({ session_token: sessionToken })
      .eq("id", voter.id)

    if (updateError) throw updateError

    // Return the session token - client will store it and send in headers
    // (Cookies don't work reliably in iframe previews due to cross-origin restrictions)
    return NextResponse.json({
      voter: { id: voter.id, name: voter.name, location: voter.location },
      sessionToken,
    })
  } catch (err) {
    console.error("Login error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
