# Auth & Permission Audit

## Clerk
- Pastikan session wajib untuk akses area protected.
- Cek JWT audience untuk Convex.

## Convex
- Pastikan query/mutation memvalidasi user.
- Cek role-based access di server.

## Next.js Routes
- Pastikan route API protected.
- Cek proxy/middleware protection.

## References wajib dibaca
- `.references/global-header`
- `.references/pages`
- `.references/conversation-id-routing`
