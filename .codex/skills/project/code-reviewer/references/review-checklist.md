# Review Checklist

## Scope
- Konfirmasi file dan modul yang masuk scope.
- Cari entry point dan dependency penting.

## Correctness
- Pastikan logic utama sesuai behavior yang diinginkan.
- Periksa edge case, null/undefined, empty state, dan race condition.
- Validasi perubahan tidak mengubah kontrak API atau data shape.

## Reliability
- Pastikan error handling jelas dan tidak silent failure.
- Pastikan state di client/server konsisten.

## Performance
- Cek query berulang, N+1, render berulang, dan data fetch berlebih.
- Pastikan memoization/derive state dipakai seperlunya.

## Maintainability
- Hapus dead code, unused import, console mubazir.
- Kurangi duplikasi, simplifikasi control flow, pecah fungsi yang terlalu panjang.
- Pastikan naming konsisten dan intent terbaca.

## Security (ringkas)
- Pastikan validasi input ada di server.
- Pastikan data sensitif tidak bocor ke client/log.

## Testing
- Update atau tambah test bila perubahan behavior.
- Jalankan lint/test/typecheck/build bila tersedia.
