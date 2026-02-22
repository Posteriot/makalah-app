import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Check for expired subscriptions daily at 00:05 WIB (17:05 UTC)
crons.daily(
  "check-expired-subscriptions",
  { hourUTC: 17, minuteUTC: 5 },
  internal.billing.subscriptionCron.checkExpiredSubscriptions
)


// Cleanup old AI telemetry records (older than 30 days) daily at 03:00 WIB (20:00 UTC)
crons.daily(
  "cleanup-old-ai-telemetry",
  { hourUTC: 20, minuteUTC: 0 },
  internal.aiTelemetry.cleanupOldTelemetry
)

export default crons
