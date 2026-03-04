import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SecurityTab } from "@/components/settings/SecurityTab"

const mockListAccounts = vi.fn()
const mockChangePassword = vi.fn()
const mockCreatePassword = vi.fn()
const mockTwoFactorEnable = vi.fn()
const mockTwoFactorDisable = vi.fn()
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    listAccounts: () => mockListAccounts(),
    changePassword: (args: unknown) => mockChangePassword(args),
    createPassword: (args: unknown) => mockCreatePassword(args),
    twoFactor: {
      enable: (args: unknown) => mockTwoFactorEnable(args),
      disable: (args: unknown) => mockTwoFactorDisable(args),
    },
  },
}))

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

function createSession() {
  return {
    user: {
      id: "user-1",
      name: "Test User",
      email: "user@example.com",
      emailVerified: true,
      createdAt: new Date("2026-03-04T10:00:00.000Z"),
      updatedAt: new Date("2026-03-04T10:00:00.000Z"),
    },
    session: {
      id: "session-1",
      userId: "user-1",
      expiresAt: new Date("2026-04-04T10:00:00.000Z"),
      token: "token",
    },
  }
}

async function openChangePasswordForm(user: ReturnType<typeof userEvent.setup>) {
  const editButton = await screen.findByRole("button", { name: "Ubah Password" })
  await user.click(editButton)
}

async function submitChangePasswordForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText("Password saat ini"), "old-password")
  await user.type(screen.getByPlaceholderText("Password baru"), "NewPass123!")
  await user.type(screen.getByPlaceholderText("Konfirmasi password"), "NewPass123!")
  await user.click(screen.getByRole("button", { name: "Simpan" }))
}

describe("SecurityTab change password handling", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListAccounts.mockResolvedValue({
      data: [{ id: "acc-1", providerId: "credential" }],
    })
    mockCreatePassword.mockResolvedValue({ error: null })
    mockTwoFactorEnable.mockResolvedValue({ error: null, data: {} })
    mockTwoFactorDisable.mockResolvedValue({ error: null, data: {} })
  })

  it("menampilkan error ketika changePassword mengembalikan error dan tidak menampilkan sukses", async () => {
    const user = userEvent.setup()
    mockChangePassword.mockResolvedValue({
      error: { message: "Password saat ini salah." },
    })

    render(<SecurityTab session={createSession()} isLoading={false} />)

    await waitFor(() => expect(mockListAccounts).toHaveBeenCalledTimes(1))
    await openChangePasswordForm(user)
    await submitChangePasswordForm(user)

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledTimes(1)
    })
    expect(mockToastError).toHaveBeenCalledWith("Password saat ini salah.")
    expect(mockToastSuccess).not.toHaveBeenCalled()
  })

  it("menampilkan sukses saat changePassword berhasil", async () => {
    const user = userEvent.setup()
    mockChangePassword.mockResolvedValue({ error: null })

    render(<SecurityTab session={createSession()} isLoading={false} />)

    await waitFor(() => expect(mockListAccounts).toHaveBeenCalledTimes(1))
    await openChangePasswordForm(user)
    await user.click(screen.getByLabelText("Keluar dari semua perangkat lain"))
    await submitChangePasswordForm(user)

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledTimes(1)
    })
    expect(mockToastSuccess).toHaveBeenCalledWith("Password berhasil diatur.")
    expect(mockToastError).not.toHaveBeenCalled()
  })

  it("membuat password inline untuk user oauth-only dan pindah ke mode ubah password", async () => {
    const user = userEvent.setup()
    mockListAccounts.mockResolvedValue({
      data: [{ id: "acc-google", providerId: "google" }],
    })
    mockCreatePassword.mockResolvedValue({ error: null })

    render(<SecurityTab session={createSession()} isLoading={false} />)

    await waitFor(() => expect(mockListAccounts).toHaveBeenCalledTimes(1))
    await user.type(screen.getByPlaceholderText("Password baru"), "NewPass123!")
    await user.type(screen.getByPlaceholderText("Konfirmasi password"), "NewPass123!")
    await user.click(screen.getByRole("button", { name: "Buat Password" }))

    await waitFor(() => {
      expect(mockCreatePassword).toHaveBeenCalledWith({ newPassword: "NewPass123!" })
    })
    expect(mockToastSuccess).toHaveBeenCalledWith("Password berhasil dibuat.")
    expect(await screen.findByRole("button", { name: "Ubah Password" })).toBeInTheDocument()
  })

  it("menampilkan error ketika create-password gagal", async () => {
    const user = userEvent.setup()
    mockListAccounts.mockResolvedValue({
      data: [{ id: "acc-google", providerId: "google" }],
    })
    mockCreatePassword.mockResolvedValue({
      error: { message: "create-password gagal" },
    })

    render(<SecurityTab session={createSession()} isLoading={false} />)

    await waitFor(() => expect(mockListAccounts).toHaveBeenCalledTimes(1))
    await user.type(screen.getByPlaceholderText("Password baru"), "NewPass123!")
    await user.type(screen.getByPlaceholderText("Konfirmasi password"), "NewPass123!")
    await user.click(screen.getByRole("button", { name: "Buat Password" }))

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("create-password gagal")
    })
  })

  it("tetap menampilkan kartu 2FA saat belum punya password, tapi tombolnya disabled", async () => {
    mockListAccounts.mockResolvedValue({
      data: [{ id: "acc-google", providerId: "google" }],
    })

    render(<SecurityTab session={createSession()} isLoading={false} />)

    await waitFor(() => expect(mockListAccounts).toHaveBeenCalledTimes(1))
    expect(screen.getByText("Verifikasi 2 Langkah (2FA)")).toBeInTheDocument()
    expect(screen.getByText("Buat password dulu untuk mengaktifkan 2FA.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Aktifkan" })).toBeDisabled()
  })
})
