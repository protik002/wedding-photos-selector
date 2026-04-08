import { NextRequest, NextResponse } from "next/server"
import { getVoterFromSession } from "@/lib/session"

export async function GET(request: NextRequest) {
  try {
    const voter = await getVoterFromSession()
    if (!voter) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const pageToken = searchParams.get("pageToken") || ""

    const apiKey = process.env.GOOGLE_API_KEY
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

    if (!apiKey || !folderId) {
      return NextResponse.json(
        { error: "Google Drive not configured" },
        { status: 500 }
      )
    }

    const query = `'${folderId}' in parents and mimeType contains 'image/'`
    const fields = "nextPageToken,files(id,name,thumbnailLink)"
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=100&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ""}`

    const resp = await fetch(url, { next: { revalidate: 300 } })
    if (!resp.ok) {
      const errorText = await resp.text()
      console.error("Google Drive API error:", resp.status, errorText)
      return NextResponse.json(
        { error: "Failed to load photos from Google Drive" },
        { status: 502 }
      )
    }

    const data = await resp.json()

    const photos = (data.files || []).map(
      (f: { id: string; name: string; thumbnailLink?: string }) => ({
        id: f.id,
        name: f.name,
        thumbnailUrl: f.thumbnailLink
          ? f.thumbnailLink.replace(/=s\d+/, "=s800")
          : `https://drive.google.com/thumbnail?id=${f.id}&sz=w800`,
        fullUrl: `https://drive.google.com/thumbnail?id=${f.id}&sz=w1200`,
      })
    )

    return NextResponse.json({
      photos,
      nextPageToken: data.nextPageToken || null,
    })
  } catch (err) {
    console.error("Photos API error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
