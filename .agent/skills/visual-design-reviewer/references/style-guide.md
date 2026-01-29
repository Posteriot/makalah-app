# Style Guide Visual (Frontend)

# Style Guide Visual (Frontend)

## Mindset Reviewer
*   **Respect the Design**: Jangan sok ide ngubah desain orang kalau nggak disuruh.
*   **Code Efficiency**: Kode styling yang bagus itu ringkas, gampang dibaca, dan reusable.
*   **Konsistensi > Unik**: Kalau ada satu tombol beda sendiri warnanya, curigai itu bug/kesalahan, bukan fitur.

## Prinsip Teknis
*   **Spacing**: Cek padding/margin. Jangan ada magic number (kayak `margin: 13px`). Pake sistem grid/spacing yang ada.
*   **Typo**: Font size dan weight harus ngikutin design token.
*   **DRY (Don't Repeat Yourself)**: Kalau ada style `{ display: flex; align-items: center; }` di-copy paste 10 kali, itu minta dibikin class utility atau component.
