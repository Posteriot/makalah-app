import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Check for expired subscriptions daily at 00:05 WIB (17:05 UTC)
crons.daily(
  "check-expired-subscriptions",
  { hourUTC: 17, minuteUTC: 5 },
  internal.billing.subscriptionCron.checkExpiredSubscriptions
)

export default crons
