import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register BetterAuth routes (sign-in, sign-up, OAuth callbacks, etc.)
// CORS required for client-side framework support
authComponent.registerRoutes(http, createAuth, { cors: true });

export default http;
