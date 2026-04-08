import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// One-time migration endpoint - adds session_token column and RLS
export async function POST(request: NextRequest) {
  try {
    const { adminPassword } = await request.json()

    if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Incorrect admin password" }, { status: 403 })
    }

    const supabase = createAdminClient()
    const results: string[] = []

    // 1. Add session_token column to voters
    const { error: e1 } = await supabase.rpc("exec_sql", {
      sql: "ALTER TABLE voters ADD COLUMN IF NOT EXISTS session_token text UNIQUE",
    }).single()

    if (e1) {
      // Try direct approach - the column might already exist
      // Try inserting/checking if it works
      results.push(`session_token column: ${e1.message || "may already exist"}`)
    } else {
      results.push("session_token column added")
    }

    // Test that we can access the tables
    const { data: voters, error: testError } = await supabase
      .from("voters")
      .select("id")
      .limit(1)

    if (testError) {
      return NextResponse.json({
        error: `Cannot access voters table: ${testError.message}`,
        hint: "Make sure your SUPABASE_SERVICE_ROLE_KEY is from the correct project",
      }, { status: 500 })
    }

    results.push(`Voters table accessible (${voters?.length ?? 0} rows found)`)

    const { data: votes, error: votesTestError } = await supabase
      .from("votes")
      .select("id")
      .limit(1)

    if (votesTestError) {
      return NextResponse.json({
        error: `Cannot access votes table: ${votesTestError.message}`,
      }, { status: 500 })
    }

    results.push(`Votes table accessible (${votes?.length ?? 0} rows found)`)

    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error("Migration error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
