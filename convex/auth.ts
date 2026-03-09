// convex/auth.ts
import { components } from "./_generated/api";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { magicLink, twoFactor } from "better-auth/plugins";
import { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import { getTrustedOrigins } from "./authOrigins";
import {
  sendVerificationEmail as sendVerificationEmailFallback,
  sendMagicLinkEmail as sendMagicLinkEmailFallback,
  sendPasswordResetEmail as sendPasswordResetEmailFallback,
  sendSignupSuccessEmail as sendSignupSuccessEmailFallback,
  sendTwoFactorOtpEmail as sendTwoFactorOtpEmailFallback,
  sendViaResend,
} from "./authEmails";
import { fetchAndRenderTemplate } from "./emailTemplateHelper";

import { twoFactorCrossDomainBypass } from "./twoFactorBypass";
import { createPasswordEndpoint } from "./createPasswordEndpoint";

// SITE_URL = primary frontend origin (production) — for crossDomain redirects
// CONVEX_SITE_URL = Convex HTTP actions URL (built-in) — where BetterAuth API runs
const siteUrl = process.env.SITE_URL!;
const convexSiteUrl = process.env.CONVEX_SITE_URL!;

// Create the BetterAuth component client
export const authComponent = createClient<DataModel>(components.betterAuth, {
  verbose: false,
});

async function sendSignupSuccessEmailSafely(email: string): Promise<void> {
  try {
    await sendSignupSuccessEmailFallback(email);
  } catch (error) {
    console.error("[Auth Email] Failed to send signup success email:", error);
  }
}

// BetterAuth configuration
export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    baseURL: convexSiteUrl,
    trustedOrigins: (request) => getTrustedOrigins(request),
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        const rendered = await fetchAndRenderTemplate(ctx, "password_reset", {
          resetUrl: url,
          appName: "Makalah AI",
        });
        if (rendered) {
          await sendViaResend(user.email, rendered.subject, rendered.html);
        } else {
          await sendPasswordResetEmailFallback(user.email, url);
        }
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        const rendered = await fetchAndRenderTemplate(ctx, "verification", {
          userName: user.name ?? user.email,
          verificationUrl: url,
          appName: "Makalah AI",
        });
        if (rendered) {
          await sendViaResend(user.email, rendered.subject, rendered.html);
        } else {
          await sendVerificationEmailFallback(user.email, url);
        }
      },
      afterEmailVerification: async (user) => {
        if (typeof user.email === "string" && user.email.length > 0) {
          const rendered = await fetchAndRenderTemplate(ctx, "signup_success", {
            userName: user.email,
            appName: "Makalah AI",
            loginUrl: (process.env.SITE_URL ?? "https://makalah.ai") + "/chat",
          });
          if (rendered) {
            try {
              await sendViaResend(user.email, rendered.subject, rendered.html);
            } catch (error) {
              console.error("[Auth Email] Failed to send signup success email:", error);
            }
          } else {
            await sendSignupSuccessEmailSafely(user.email);
          }
        }
      },
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        disableImplicitSignUp: true,
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const email = typeof user.email === "string" ? user.email : "";
            if (!email || user.emailVerified !== true) {
              return;
            }
            const rendered = await fetchAndRenderTemplate(ctx, "signup_success", {
              userName: email,
              appName: "Makalah AI",
              loginUrl: (process.env.SITE_URL ?? "https://makalah.ai") + "/chat",
            });
            if (rendered) {
              try {
                await sendViaResend(email, rendered.subject, rendered.html);
              } catch (error) {
                console.error("[Auth Email] Failed to send signup success email:", error);
              }
            } else {
              await sendSignupSuccessEmailSafely(email);
            }
          },
        },
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
          const rendered = await fetchAndRenderTemplate(ctx, "magic_link", {
            email,
            magicLinkUrl: url,
            appName: "Makalah AI",
            expiryMinutes: "5",
          });
          if (rendered) {
            await sendViaResend(email, rendered.subject, rendered.html);
          } else {
            await sendMagicLinkEmailFallback(email, url);
          }
        },
        expiresIn: 300, // 5 minutes
      }),
      twoFactor({
        skipVerificationOnEnable: true,
        otpOptions: {
          sendOTP: async ({ user, otp }) => {
            // BetterAuth's built-in OTP sender — used for enable/disable flows.
            // Cross-domain sign-in flow uses custom endpoints instead.
            const rendered = await fetchAndRenderTemplate(ctx, "two_factor_otp", {
              otpCode: otp,
              appName: "Makalah AI",
            });
            if (rendered) {
              await sendViaResend(user.email, rendered.subject, rendered.html);
            } else {
              await sendTwoFactorOtpEmailFallback(user.email, otp);
            }
          },
        },
      }),
      createPasswordEndpoint(),
      twoFactorCrossDomainBypass(),
    ],
  }) satisfies BetterAuthOptions;

// Export createAuth function (used by HTTP router and component helpers)
export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));

// Export client API for use in Convex queries
export const { getAuthUser } = authComponent.clientApi();
