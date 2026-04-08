import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateSessionToken } from "@/lib/session"

// Test endpoint: creates 2 test users, votes on photos, returns results
// GET /api/test?password=YOUR_ACCESS_PASSWORD

export async function GET(request: Request) {
  const logs: string[] = []
  const log = (msg: string) => {
    console.log(`[v0] ${msg}`)
    logs.push(msg)
  }
  
  try {
    const { searchParams } = new URL(request.url)
    const password = searchParams.get("password")
    
    if (!password || password !== process.env.ACCESS_PASSWORD) {
      return NextResponse.json({ error: "Invalid password. Use ?password=YOUR_ACCESS_PASSWORD" }, { status: 401 })
    }
    
    const supabase = createAdminClient()
    
    log("=".repeat(60))
    log("WEDDING PHOTO SELECTOR - TEST FLOW")
    log("=".repeat(60))
    
    // Step 1: Create or get test user 1
    log("\n[USER 1] Creating/finding test user...")
    let user1 = null
    const { data: existing1 } = await supabase
      .from("voters")
      .select("*")
      .eq("name", "test")
      .eq("location", "test-location")
      .limit(1)
    
    if (existing1 && existing1.length > 0) {
      user1 = existing1[0]
      log(`[USER 1] Found existing user: id=${user1.id}`)
    } else {
      const token1 = generateSessionToken()
      const { data: newUser1, error: err1 } = await supabase
        .from("voters")
        .insert({ name: "test", location: "test-location", session_token: token1 })
        .select()
        .single()
      if (err1) throw new Error(`Failed to create user1: ${err1.message}`)
      user1 = newUser1
      log(`[USER 1] Created new user: id=${user1.id}`)
    }
    
    // Step 2: Create or get test user 2
    log("\n[USER 2] Creating/finding test user 2...")
    let user2 = null
    const { data: existing2 } = await supabase
      .from("voters")
      .select("*")
      .eq("name", "test2")
      .eq("location", "test-location-2")
      .limit(1)
    
    if (existing2 && existing2.length > 0) {
      user2 = existing2[0]
      log(`[USER 2] Found existing user: id=${user2.id}`)
    } else {
      const token2 = generateSessionToken()
      const { data: newUser2, error: err2 } = await supabase
        .from("voters")
        .insert({ name: "test2", location: "test-location-2", session_token: token2 })
        .select()
        .single()
      if (err2) throw new Error(`Failed to create user2: ${err2.message}`)
      user2 = newUser2
      log(`[USER 2] Created new user: id=${user2.id}`)
    }
    
    // Step 3: Get photos from Google Drive
    log("\n[PHOTOS] Fetching photos from Google Drive...")
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
    const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID
    
    if (!GOOGLE_API_KEY || !GOOGLE_DRIVE_FOLDER_ID) {
      log("[PHOTOS ERROR] Missing GOOGLE_API_KEY or GOOGLE_DRIVE_FOLDER_ID")
      return NextResponse.json({ 
        error: "Missing Google API config", 
        logs,
        missingEnvVars: {
          GOOGLE_API_KEY: !GOOGLE_API_KEY,
          GOOGLE_DRIVE_FOLDER_ID: !GOOGLE_DRIVE_FOLDER_ID
        }
      }, { status: 500 })
    }
    
    const photosUrl = `https://www.googleapis.com/drive/v3/files?q='${GOOGLE_DRIVE_FOLDER_ID}'+in+parents+and+mimeType+contains+'image/'&key=${GOOGLE_API_KEY}&fields=files(id,name,mimeType,thumbnailLink)&pageSize=50`
    
    const photosRes = await fetch(photosUrl)
    const photosData = await photosRes.json()
    
    if (!photosRes.ok) {
      log(`[PHOTOS ERROR] Google Drive API error: ${JSON.stringify(photosData.error || photosData)}`)
      return NextResponse.json({ 
        error: "Google Drive API error", 
        details: photosData.error || photosData,
        logs 
      }, { status: 500 })
    }
    
    const photos = photosData.files || []
    log(`[PHOTOS] Got ${photos.length} photos`)
    
    if (photos.length === 0) {
      log("[PHOTOS ERROR] No photos found in folder")
      return NextResponse.json({ error: "No photos in folder", logs }, { status: 500 })
    }
    
    // Show first 5 photos
    log("\n[PHOTOS] First 5 photos:")
    photos.slice(0, 5).forEach((p: { name: string }, i: number) => {
      log(`  ${i + 1}. ${p.name}`)
    })
    
    // Step 4: User 1 swipes LEFT on first 5 photos
    log("\n" + "=".repeat(60))
    log(`USER 1 (${user1.name}) - SWIPING LEFT ON FIRST 5 PHOTOS`)
    log("=".repeat(60))
    
    for (let i = 0; i < Math.min(5, photos.length); i++) {
      const photoFilename = photos[i].name
      const { error } = await supabase
        .from("votes")
        .upsert(
          { voter_id: user1.id, photo_filename: photoFilename, direction: -1 },
          { onConflict: "voter_id,photo_filename" }
        )
      if (error) {
        log(`[VOTE ERROR] ${photoFilename}: ${error.message}`)
      } else {
        log(`[VOTE] NOPE on "${photoFilename}"`)
      }
    }
    
    // Step 5: User 2 swipes RIGHT on first 5 photos
    log("\n" + "=".repeat(60))
    log(`USER 2 (${user2.name}) - SWIPING RIGHT ON FIRST 5 PHOTOS`)
    log("=".repeat(60))
    
    for (let i = 0; i < Math.min(5, photos.length); i++) {
      const photoFilename = photos[i].name
      const { error } = await supabase
        .from("votes")
        .upsert(
          { voter_id: user2.id, photo_filename: photoFilename, direction: 1 },
          { onConflict: "voter_id,photo_filename" }
        )
      if (error) {
        log(`[VOTE ERROR] ${photoFilename}: ${error.message}`)
      } else {
        log(`[VOTE] KEEP on "${photoFilename}"`)
      }
    }
    
    // Step 6: Get results
    log("\n" + "=".repeat(60))
    log("CHECKING RESULTS")
    log("=".repeat(60))
    
    const { data: allVotes, error: votesError } = await supabase
      .from("votes")
      .select("photo_filename, direction")
    
    if (votesError) {
      log(`[RESULTS ERROR] ${votesError.message}`)
      return NextResponse.json({ error: votesError.message, logs }, { status: 500 })
    }
    
    // Aggregate results
    const resultsMap = new Map<string, { keeps: number; rejects: number }>()
    for (const vote of allVotes || []) {
      const existing = resultsMap.get(vote.photo_filename) || { keeps: 0, rejects: 0 }
      if (vote.direction === 1) {
        existing.keeps++
      } else {
        existing.rejects++
      }
      resultsMap.set(vote.photo_filename, existing)
    }
    
    const results = Array.from(resultsMap.entries()).map(([filename, stats]) => ({
      photo_filename: filename,
      keeps: stats.keeps,
      rejects: stats.rejects,
      score: stats.keeps - stats.rejects,
      total: stats.keeps + stats.rejects
    }))
    
    log("\n[RESULTS TABLE]")
    log("-".repeat(60))
    log("Photo Name                        | Keep | Nope | Score")
    log("-".repeat(60))
    
    // Show results for the first 5 photos we voted on
    const votedPhotos = photos.slice(0, 5).map((p: { name: string }) => p.name)
    const votedResults = results.filter(r => votedPhotos.includes(r.photo_filename))
    
    votedResults.forEach(r => {
      const name = r.photo_filename.slice(0, 32).padEnd(32)
      const keep = String(r.keeps).padStart(4)
      const nope = String(r.rejects).padStart(4)
      const score = String(r.score).padStart(5)
      log(`${name} | ${keep} | ${nope} | ${score}`)
    })
    
    log("-".repeat(60))
    log("\n[EXPECTED] Each photo should have: 1 keep, 1 nope, score = 0")
    
    log("\n" + "=".repeat(60))
    log("TEST COMPLETE")
    log("=".repeat(60))
    
    return NextResponse.json({
      success: true,
      users: [
        { id: user1.id, name: user1.name },
        { id: user2.id, name: user2.name }
      ],
      photosVotedOn: votedPhotos,
      results: votedResults,
      logs
    })
    
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    log(`[FATAL ERROR] ${errorMsg}`)
    return NextResponse.json({ error: errorMsg, logs }, { status: 500 })
  }
}
