import type { BetterAuthPlugin } from "better-auth"
import { sensitiveSessionMiddleware } from "better-auth/api"
import { createAuthEndpoint } from "better-auth/plugins"
import { APIError } from "better-call"
import * as z from "zod"

interface AuthAccountLike {
  id: string
  providerId: string
  password?: string | null
}

export const createPasswordEndpoint = (): BetterAuthPlugin => {
  return {
    id: "create-password-endpoint",
    endpoints: {
      createPassword: createAuthEndpoint(
        "/create-password",
        {
          method: "POST",
          body: z.object({
            newPassword: z.string(),
          }),
          use: [sensitiveSessionMiddleware],
        },
        async (ctx) => {
          const { newPassword } = ctx.body
          const session = ctx.context.session
          const minPasswordLength = ctx.context.password.config.minPasswordLength
          const maxPasswordLength = ctx.context.password.config.maxPasswordLength

          if (newPassword.length < minPasswordLength) {
            throw new APIError("BAD_REQUEST", {
              message: "PASSWORD_TOO_SHORT",
            })
          }
          if (newPassword.length > maxPasswordLength) {
            throw new APIError("BAD_REQUEST", {
              message: "PASSWORD_TOO_LONG",
            })
          }

          const accounts = (await ctx.context.internalAdapter.findAccounts(
            session.user.id
          )) as AuthAccountLike[]
          const credentialAccount = accounts.find(
            (account) => account.providerId === "credential"
          )

          if (credentialAccount?.password) {
            throw new APIError("BAD_REQUEST", {
              message: "user already has a password",
            })
          }

          const passwordHash = await ctx.context.password.hash(newPassword)

          if (credentialAccount) {
            await ctx.context.internalAdapter.updateAccount(credentialAccount.id, {
              password: passwordHash,
            })
          } else {
            await ctx.context.internalAdapter.linkAccount({
              userId: session.user.id,
              providerId: "credential",
              accountId: session.user.id,
              password: passwordHash,
            })
          }

          return ctx.json({ status: true })
        }
      ),
    },
  }
}
