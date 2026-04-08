// Test script: Login with two users, vote on photos, check results

const BASE_URL = "http://localhost:3000"

async function login(name, location, password) {
  console.log(`\n[LOGIN] Logging in as "${name}" from "${location}"...`)
  
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, location, password }),
    credentials: "include",
  })
  
  const data = await res.json()
  
  if (!res.ok) {
    console.error(`[LOGIN ERROR] Status ${res.status}:`, data)
    return null
  }
  
  // Extract the session cookie from Set-Cookie header
  const setCookie = res.headers.get("set-cookie")
  const sessionMatch = setCookie?.match(/wedding_session=([^;]+)/)
  const sessionToken = sessionMatch?.[1]
  
  console.log(`[LOGIN SUCCESS] Voter ID: ${data.voter.id}, Session token: ${sessionToken ? sessionToken.slice(0, 16) + "..." : "NOT FOUND"}`)
  
  return { voter: data.voter, sessionToken, cookie: `wedding_session=${sessionToken}` }
}

async function getPhotos(cookie, pageToken = "") {
  console.log(`\n[PHOTOS] Fetching photos...`)
  
  const url = pageToken 
    ? `${BASE_URL}/api/photos?pageToken=${pageToken}` 
    : `${BASE_URL}/api/photos`
  
  const res = await fetch(url, {
    headers: { Cookie: cookie },
  })
  
  const data = await res.json()
  
  if (!res.ok) {
    console.error(`[PHOTOS ERROR] Status ${res.status}:`, data)
    return null
  }
  
  console.log(`[PHOTOS SUCCESS] Got ${data.photos?.length || 0} photos`)
  return data
}

async function vote(cookie, photoFilename, direction) {
  const dirLabel = direction === 1 ? "KEEP" : "NOPE"
  console.log(`[VOTE] Voting ${dirLabel} on "${photoFilename}"...`)
  
  const res = await fetch(`${BASE_URL}/api/vote`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ photoFilename, direction }),
  })
  
  const data = await res.json()
  
  if (!res.ok) {
    console.error(`[VOTE ERROR] Status ${res.status}:`, data)
    return false
  }
  
  console.log(`[VOTE SUCCESS] ${dirLabel} on "${photoFilename}"`)
  return true
}

async function getResults(cookie) {
  console.log(`\n[RESULTS] Fetching results...`)
  
  const res = await fetch(`${BASE_URL}/api/results`, {
    headers: { Cookie: cookie },
  })
  
  const data = await res.json()
  
  if (!res.ok) {
    console.error(`[RESULTS ERROR] Status ${res.status}:`, data)
    return null
  }
  
  console.log(`[RESULTS SUCCESS] Got ${data.results?.length || 0} photo results`)
  return data
}

async function runTest() {
  const PASSWORD = process.env.ACCESS_PASSWORD || "test123"
  
  console.log("=" .repeat(60))
  console.log("WEDDING PHOTO SELECTOR - TEST FLOW")
  console.log("=" .repeat(60))
  
  // Step 1: Login as User 1 (test)
  const user1 = await login("test", "test-location", PASSWORD)
  if (!user1) {
    console.error("\n[FATAL] Could not login as user1")
    return
  }
  
  // Step 2: Get photos
  const photosData = await getPhotos(user1.cookie)
  if (!photosData?.photos?.length) {
    console.error("\n[FATAL] Could not get photos")
    return
  }
  
  const photos = photosData.photos
  console.log(`\n[INFO] Total photos available: ${photos.length}`)
  console.log(`[INFO] First 5 photos:`)
  photos.slice(0, 5).forEach((p, i) => console.log(`  ${i + 1}. ${p.name}`))
  
  // Step 3: User 1 swipes LEFT (reject) on first 5 photos
  console.log(`\n${"=".repeat(60)}`)
  console.log(`USER 1 (${user1.voter.name}) - SWIPING LEFT ON FIRST 5 PHOTOS`)
  console.log("=".repeat(60))
  
  for (let i = 0; i < Math.min(5, photos.length); i++) {
    await vote(user1.cookie, photos[i].name, -1) // -1 = reject
  }
  
  // Step 4: Login as User 2 (test2)
  console.log(`\n${"=".repeat(60)}`)
  console.log("LOGGING IN AS USER 2")
  console.log("=".repeat(60))
  
  const user2 = await login("test2", "test-location-2", PASSWORD)
  if (!user2) {
    console.error("\n[FATAL] Could not login as user2")
    return
  }
  
  // Step 5: User 2 swipes RIGHT (keep) on first 5 photos
  console.log(`\n${"=".repeat(60)}`)
  console.log(`USER 2 (${user2.voter.name}) - SWIPING RIGHT ON FIRST 5 PHOTOS`)
  console.log("=".repeat(60))
  
  for (let i = 0; i < Math.min(5, photos.length); i++) {
    await vote(user2.cookie, photos[i].name, 1) // 1 = keep
  }
  
  // Step 6: Check results
  console.log(`\n${"=".repeat(60)}`)
  console.log("CHECKING RESULTS")
  console.log("=".repeat(60))
  
  const results = await getResults(user2.cookie)
  if (results?.results) {
    console.log("\n[RESULTS TABLE]")
    console.log("-".repeat(60))
    console.log("Photo Name                        | Keep | Nope | Score")
    console.log("-".repeat(60))
    
    // Show results for the first 5 photos we voted on
    const votedPhotos = photos.slice(0, 5).map(p => p.name)
    const votedResults = results.results.filter(r => votedPhotos.includes(r.photo_filename))
    
    votedResults.forEach(r => {
      const name = r.photo_filename.slice(0, 32).padEnd(32)
      const keep = String(r.keeps).padStart(4)
      const nope = String(r.rejects).padStart(4)
      const score = String(r.score).padStart(5)
      console.log(`${name} | ${keep} | ${nope} | ${score}`)
    })
    
    console.log("-".repeat(60))
    console.log(`\n[EXPECTED] Each photo should have: 1 keep, 1 nope, score = 0`)
  }
  
  console.log("\n" + "=".repeat(60))
  console.log("TEST COMPLETE")
  console.log("=".repeat(60))
}

runTest().catch(err => {
  console.error("\n[FATAL ERROR]", err)
  process.exit(1)
})
