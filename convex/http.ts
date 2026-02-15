import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { sendOtp, verifyOtp } from "./twoFactorHttp";
import { enableTwoFactorAllUsers } from "./migrations/enableTwoFactorAllUsers";

const http = httpRouter();

// Register BetterAuth routes (sign-in, sign-up, OAuth callbacks, etc.)
// CORS required for client-side framework support
authComponent.registerRoutes(http, createAuth, { cors: true });

// Custom 2FA OTP endpoints (cross-domain workaround for twoFactor plugin)
http.route({
  path: "/api/auth/2fa/send-otp",
  method: "POST",
  handler: sendOtp,
});
http.route({
  path: "/api/auth/2fa/send-otp",
  method: "OPTIONS",
  handler: sendOtp,
});
http.route({
  path: "/api/auth/2fa/verify-otp",
  method: "POST",
  handler: verifyOtp,
});
http.route({
  path: "/api/auth/2fa/verify-otp",
  method: "OPTIONS",
  handler: verifyOtp,
});

// One-time migration: enable 2FA for all existing credential users
http.route({
  path: "/api/migrations/enable-2fa-all",
  method: "POST",
  handler: enableTwoFactorAllUsers,
});

export default http;
