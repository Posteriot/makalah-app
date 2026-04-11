import PDFDocument from "pdfkit";
import { mkdirSync, createWriteStream } from "node:fs";
import { join } from "node:path";

const outputDir = "/tmp/attachment-awareness-smoke";
mkdirSync(outputDir, { recursive: true });

function writePdf(fileName, paragraphs) {
  return new Promise((resolve, reject) => {
    const fullPath = join(outputDir, fileName);
    const doc = new PDFDocument({ margin: 48 });
    const stream = createWriteStream(fullPath);
    doc.pipe(stream);

    doc.font("Times-Roman").fontSize(12);
    for (const paragraph of paragraphs) {
      doc.text(paragraph, { align: "justify" });
      doc.moveDown();
    }

    doc.end();
    stream.on("finish", () => resolve(fullPath));
    stream.on("error", reject);
  });
}

function repeatParagraph(base, count) {
  return Array.from({ length: count }, (_, index) => `${base} Paragraf ${index + 1}.`);
}

const mediumParagraphs = [
  "Judul penelitian ini adalah Pengaruh Integrasi Artificial Intelligence terhadap Kualitas Pembelajaran Mahasiswa di Perguruan Tinggi Indonesia.",
  "Abstrak: Penelitian ini menganalisis bagaimana penggunaan AI generatif memengaruhi efektivitas belajar, partisipasi kelas, dan kualitas tugas akademik mahasiswa semester akhir.",
  "Metodologi: Penelitian menggunakan mixed methods dengan survei terhadap 240 mahasiswa, wawancara mendalam terhadap 18 dosen, dan analisis dokumen kebijakan kampus.",
  "Instrumen utama mencakup kuesioner Likert lima skala, panduan wawancara semi-terstruktur, dan rubric evaluasi tugas sebelum-sesudah adopsi AI.",
  "Hasil utama menunjukkan peningkatan efisiensi pencarian referensi, tetapi juga muncul risiko ketergantungan berlebihan tanpa kemampuan evaluasi sumber yang memadai.",
  "Rekomendasi penelitian menekankan literasi AI, etika akademik, dan desain asesmen yang menguji argumentasi asli mahasiswa."
].flatMap((paragraph) => repeatParagraph(paragraph, 18));

const largeParagraphs = repeatParagraph(
  "Disertasi ini membahas transformasi digital pendidikan tinggi dengan fokus pada AI generatif, tata kelola data, metodologi penelitian longitudinal, dan implikasi kebijakan nasional.",
  1400
);

function budgetParagraph(fileNumber) {
  return `File anggaran ${fileNumber} membahas tema akademik berbeda tetapi tetap relevan untuk uji attachment awareness. Bagian metodologi menekankan studi kasus, observasi kelas, dan analisis wawancara terstruktur.`;
}

const budgetSets = Array.from({ length: 5 }, (_, index) =>
  repeatParagraph(budgetParagraph(index + 1), 320)
);

const outputs = [];
outputs.push(await writePdf("t2-medium-reference.pdf", mediumParagraphs));
outputs.push(await writePdf("t6-large-reference.pdf", largeParagraphs));
for (let index = 0; index < budgetSets.length; index += 1) {
  outputs.push(await writePdf(`t7-budget-file-${index + 1}.pdf`, budgetSets[index]));
}

console.log(JSON.stringify({ outputDir, files: outputs }, null, 2));
