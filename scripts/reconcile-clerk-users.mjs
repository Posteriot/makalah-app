#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { createClerkClient } from "@clerk/backend"

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, "utf8")
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eqIndex = line.indexOf("=")
    if (eqIndex <= 0) continue
    const key = line.slice(0, eqIndex).trim()
    let value = line.slice(eqIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

async function main() {
  const rootDir = process.cwd()
  loadEnvFile(path.join(rootDir, ".env.local"))

  const secretKey = process.env.CLERK_SECRET_KEY
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY tidak ditemukan di environment")
  }

  const client = createClerkClient({ secretKey })
  const limit = 100
  let offset = 0
  const snapshot = []

  while (true) {
    const page = await client.users.getUserList({
      limit,
      offset,
      orderBy: "-created_at",
    })

    for (const user of page.data) {
      const primaryEmail =
        user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId) ??
        user.emailAddresses[0]

      if (!primaryEmail?.emailAddress) continue

      snapshot.push({
        clerkUserId: user.id,
        email: primaryEmail.emailAddress,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        emailVerified: primaryEmail.verification?.status === "verified",
        lastSignInAt: user.lastSignInAt ?? undefined,
      })
    }

    offset += page.data.length
    if (offset >= page.totalCount || page.data.length === 0) {
      break
    }
  }

  const argsPayload = JSON.stringify({ clerkUsers: snapshot })
  const runResult = spawnSync(
    "npm",
    [
      "run",
      "convex",
      "--",
      "run",
      "--push",
      "migrations/reconcileClerkUsers:reconcileClerkUsers",
      argsPayload,
    ],
    {
      stdio: "inherit",
      cwd: rootDir,
      env: process.env,
    }
  )

  if (runResult.status !== 0) {
    throw new Error("Rekonsiliasi gagal dijalankan di Convex")
  }

  console.log(`Rekonsiliasi selesai. Snapshot Clerk: ${snapshot.length} user.`)
}

main().catch((error) => {
  console.error("[reconcile-clerk-users] Error:", error)
  process.exit(1)
})
