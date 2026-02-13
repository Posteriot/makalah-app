// convex/auth.ts
import { components } from "./_generated/api";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { magicLink } from "better-auth/plugins";
import { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import { sendVerificationEmail, sendMagicLinkEmail, sendPasswordResetEmail } from "./authEmails";

const siteUrl = process.env.SITE_URL!;

// Create the BetterAuth component client
export const authComponent = createClient<DataModel>(components.betterAuth, {
  verbose: false,
});

// BetterAuth configuration
export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    baseURL: siteUrl,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await sendPasswordResetEmail(user.email, url);
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendVerificationEmail(user.email, url);
      },
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
      },
    },
    plugins: [
      crossDomain({ siteUrl }),
      convex({ authConfig }),
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          await sendMagicLinkEmail(email, url);
        },
        expiresIn: 300, // 5 minutes
      }),
    ],
  }) satisfies BetterAuthOptions;

// Export createAuth function (used by HTTP router and component helpers)
export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));

// Export client API for use in Convex queries
export const { getAuthUser } = authComponent.clientApi();
