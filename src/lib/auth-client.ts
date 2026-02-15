"use client"

import { createAuthClient } from "better-auth/react";
import { convexClient, crossDomainClient } from "@convex-dev/better-auth/client/plugins";
import { magicLinkClient, twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [convexClient(), crossDomainClient(), magicLinkClient(), twoFactorClient()],
});

// Re-export commonly used methods
export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
