#!/usr/bin/env node
/**
 * Reproduction script for unhandledRejection bug in search probe handling.
 *
 * Simulates the exact async pattern from orchestrator.ts:
 * 1. A "streamText" result that rejects (simulating 503)
 * 2. Probes created from the result's .sources / .providerMetadata
 * 3. Main flow throws before Promise.allSettled consumes probes
 *
 * Runs both OLD (throw in catch) and NEW (return status) patterns.
 * Reports whether unhandledRejection fires.
 */

const _RETRIEVER_TIMEOUT_MS = 5000

// Track unhandledRejection events
let unhandledCount = 0
process.on("unhandledRejection", (reason) => {
  unhandledCount++
  console.log(`  ⚠️  unhandledRejection #${unhandledCount}: ${reason}`)
})

function createFailingStreamResult() {
  // Simulates a streamText result where .text, .sources, .providerMetadata all reject
  const rejection = Promise.reject(new Error("503 Service Unavailable: high demand"))
  // Suppress the base rejection — we only care about probe behavior
  rejection.catch(() => {})
  return {
    text: Promise.reject(new Error("503 Service Unavailable: high demand")),
    sources: Promise.reject(new Error("503 sources unavailable")),
    providerMetadata: Promise.reject(new Error("503 metadata unavailable")),
  }
}

async function testOldPattern() {
  console.log("\n=== OLD PATTERN (throw in .catch) ===")
  unhandledCount = 0
  const searchResult = createFailingStreamResult()

  // OLD: probes re-throw errors
  const sourcesProbe = Promise.resolve(searchResult.sources)
    .then((value) => { console.log("  sources_ready"); return value })
    .catch((err) => { console.log(`  sources_failed: ${err.message}`); throw err })

  const metadataProbe = Promise.resolve(searchResult.providerMetadata)
    .then((value) => { console.log("  metadata_ready"); return value })
    .catch((err) => { console.log(`  metadata_failed: ${err.message}`); throw err })

  // Main text await throws — execution jumps to catch, skipping allSettled
  try {
    await searchResult.text
    // This line is never reached
    await Promise.allSettled([sourcesProbe, metadataProbe])
  } catch (err) {
    console.log(`  text_failed: ${err.message}`)
    console.log("  (jumped to catch — allSettled never reached)")
  }

  // Give event loop time to process unhandled rejections
  await new Promise(r => setTimeout(r, 100))
  console.log(`  Result: ${unhandledCount} unhandledRejection(s)`)
  return unhandledCount
}

async function testNewPattern() {
  console.log("\n=== NEW PATTERN (return status in .catch) ===")
  unhandledCount = 0
  const searchResult = createFailingStreamResult()

  // NEW: probes return status objects, never reject
  const sourcesProbe = Promise.resolve(searchResult.sources)
    .then((value) => { console.log("  sources_ready"); return { ok: true, value } })
    .catch((err) => { console.log(`  sources_failed: ${err.message}`); return { ok: false, error: err.message } })

  const metadataProbe = Promise.resolve(searchResult.providerMetadata)
    .then((value) => { console.log("  metadata_ready"); return { ok: true, value } })
    .catch((err) => { console.log(`  metadata_failed: ${err.message}`); return { ok: false, error: err.message } })

  // Main text await throws — same as old pattern
  try {
    await searchResult.text
    await Promise.allSettled([sourcesProbe, metadataProbe])
  } catch (err) {
    console.log(`  text_failed: ${err.message}`)
    console.log("  (jumped to catch — allSettled never reached)")
  }

  // Give event loop time
  await new Promise(r => setTimeout(r, 100))
  console.log(`  Result: ${unhandledCount} unhandledRejection(s)`)
  return unhandledCount
}

async function main() {
  console.log("Probe unhandledRejection reproduction test")
  console.log("==========================================")

  const oldCount = await testOldPattern()
  const newCount = await testNewPattern()

  console.log("\n=== SUMMARY ===")
  console.log(`  OLD pattern: ${oldCount} unhandledRejection(s) ${oldCount > 0 ? "❌ BUG CONFIRMED" : "✅"}`)
  console.log(`  NEW pattern: ${newCount} unhandledRejection(s) ${newCount === 0 ? "✅ FIX VERIFIED" : "❌ STILL BROKEN"}`)

  process.exit(newCount > 0 ? 1 : 0)
}

main()
