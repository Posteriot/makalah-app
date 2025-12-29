/**
 * Convex Authentication Configuration
 * Configures Clerk as the authentication provider
 */
const authConfig = {
  providers: [
    {
      domain: "https://artistic-hawk-97.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
}

export default authConfig
