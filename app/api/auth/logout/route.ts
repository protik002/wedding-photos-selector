import { NextResponse } from "next/server"

export async function POST() {
  // Session is now managed client-side via sessionStorage
  // Server just acknowledges the logout request
  return NextResponse.json({ success: true })
}
