// convex/auth.config.ts
// Auth configuration for BetterAuth Convex plugin
// getAuthConfigProvider() generates a customJwt provider with applicationID "convex"
// that the convex() plugin uses for JWT token validation
import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;
