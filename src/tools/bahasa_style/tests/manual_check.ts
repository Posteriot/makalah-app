import { BahasaStyle } from '../index';

const BAD_TEXT = `
Penelitian ini bertujuan untuk menganalisis data.
Data tersebut diambil dari lapangan.
Hasilnya menunjukkan angka yang bagus.
Dimana data ini sangat penting.
Oleh karena itu kita harus hati-hati.
Namun ada masalah lain.
Namun masalah itu bisa diatasi.
Adalah penting untuk mengetahui bahwa data valid.
Hasil ini mungkin salah.
Keputusan tergantung cuaca.
`;

console.log("--- Testing Bad Makalah ---");
const result = BahasaStyle.validate(BAD_TEXT);

console.log(`IsValid: ${result.isValid}`);
const GOOD_TEXT = `
Data valid.
Analisis ini penting.
Hasil analisis menunjukkan adanya korelasi positif yang sangat signifikan antara kedua variabel tersebut dalam jangka panjang.
Hal ini menggembirakan.
Kita harus fokus.
Meskipun demikian, kita harus tetap waspada terhadap anomali.
Kesuksesan ada di depan mata.
Semua tim siap.
Proyek ini jalan.
Target tercapai.
`;

console.log("\n--- Testing Good Makalah (Rhythm Check) ---");
const goodResult = BahasaStyle.validate(GOOD_TEXT);
console.log(`IsValid: ${goodResult.isValid} (Should be true/high score)`);
if (goodResult.issues.length === 0) {
    console.log("✅ Passed: No monotony detected in varied sentences.");
} else {
    console.log("❌ Failed: Valid text was flagged:", goodResult.issues);
}
