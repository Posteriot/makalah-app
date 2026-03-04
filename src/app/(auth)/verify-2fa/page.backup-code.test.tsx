import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ReactNode } from "react"
import Verify2FAPageWrapper from "@/app/(auth)/verify-2fa/page"

const pushMock = vi.fn()
const replaceMock = vi.fn()

const getPending2FAMock = vi.fn()
const clearPending2FAMock = vi.fn()
const sendOtpMock = vi.fn()
const verifyOtpMock = vi.fn()
const verifyBackupCodeMock = vi.fn()
const signInEmailMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/components/auth/AuthWideCard", () => ({
  AuthWideCard: ({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}))

vi.mock("@/lib/utils/redirectAfterAuth", () => ({
  getRedirectUrl: () => "/",
}))

vi.mock("@/lib/auth-2fa", () => ({
  getPending2FA: () => getPending2FAMock(),
  clearPending2FA: () => clearPending2FAMock(),
  sendOtp: (email: string) => sendOtpMock(email),
  verifyOtp: (email: string, code: string) => verifyOtpMock(email, code),
  verifyBackupCode: (email: string, code: string) =>
    verifyBackupCodeMock(email, code),
}))

vi.mock("@/lib/auth-client", () => ({
  signIn: {
    email: (...args: unknown[]) => signInEmailMock(...args),
  },
}))

describe("Verify2FAPage backup code mode", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPending2FAMock.mockReturnValue({
      email: "user@example.com",
      password: "Secret123!",
      redirectUrl: "/chat",
    })
    sendOtpMock.mockResolvedValue({ status: true })
    verifyOtpMock.mockResolvedValue({ status: false, error: "not used" })
    verifyBackupCodeMock.mockResolvedValue({
      status: true,
      bypassToken: "bypass-123",
    })
    signInEmailMock.mockResolvedValue({
      error: { message: "Gagal masuk. Silakan coba lagi." },
    })
  })

  it("bisa switch ke mode backup code", async () => {
    const user = userEvent.setup()

    render(<Verify2FAPageWrapper />)

    await waitFor(() => {
      expect(sendOtpMock).toHaveBeenCalledWith("user@example.com")
    })

    await user.click(screen.getByRole("button", { name: "Backup code" }))

    expect(
      screen.getByPlaceholderText("Contoh: DX1va-73eL5")
    ).toBeInTheDocument()
    expect(screen.queryByText("Kirim ulang kode")).not.toBeInTheDocument()
  })

  it("submit backup mode memanggil verifyBackupCode dan meneruskan bypass header", async () => {
    const user = userEvent.setup()

    render(<Verify2FAPageWrapper />)

    await waitFor(() => {
      expect(sendOtpMock).toHaveBeenCalledWith("user@example.com")
    })

    await user.click(screen.getByRole("button", { name: "Backup code" }))
    await user.type(
      screen.getByPlaceholderText("Contoh: DX1va-73eL5"),
      "DX1va-73eL5"
    )
    await user.click(screen.getByRole("button", { name: "VERIFIKASI" }))

    await waitFor(() => {
      expect(verifyBackupCodeMock).toHaveBeenCalledWith(
        "user@example.com",
        "DX1va-73eL5"
      )
    })
    await waitFor(() => {
      expect(signInEmailMock).toHaveBeenCalledTimes(1)
    })

    const signInCall = signInEmailMock.mock.calls[0] as [
      unknown,
      { onRequest: (ctx: { headers: Headers }) => { headers: Headers } }
    ]
    const onRequest = signInCall[1].onRequest
    const ctx = { headers: new Headers() }

    onRequest(ctx)

    expect(ctx.headers.get("X-2FA-Bypass-Token")).toBe("bypass-123")
  })
})
