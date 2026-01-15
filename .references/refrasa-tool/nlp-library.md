Dari latar belakang “Refrasa”, kebutuhan NLP kamu **bukan** untuk “mengganti peran LLM”, tapi untuk **guardrails + struktur**: menjaga *escape clause* (istilah teknis, entitas, sitasi, markdown), memecah kalimat/paragraf rapi, dan memberi *signal* yang lebih objektif untuk “issues” (bukan skor). Dengan kebutuhan seperti itu, rekomendasi paling tepat adalah **stack hybrid**: *rule-based parsing* untuk struktur + *model NLP modern* untuk entitas/istilah.

## Rekomendasi paling tepat untuk Refrasa (paling terpercaya & unggul)

### ✅ Pilihan utama (paling “production-grade”): **Hugging Face Transformers + model Indonesian (IndoBERT/IndoNLU family)**

**Kenapa cocok:** kamu butuh **Named Entity Recognition (NER)** dan deteksi frasa penting/istilah yang *should-not-rewrite* (proper nouns, nama institusi, lokasi, judul, dsb). Ekosistem Transformers paling matang untuk itu, dan **IndoBERT (IndoBenchmark)** adalah model Indonesia yang sangat umum dipakai sebagai backbone. ([Hugging Face][1])

**Apa yang kamu pakai dari sini untuk Refrasa:**

* **NER** untuk melindungi *proper nouns / named entities* dari paraphrase yang “kebablasan”
* **Phrase boundary / token alignment** (buat highlight before/after di UI)
* (Opsional) klasifikasi sederhana: “token ini kemungkinan istilah teknis / bukan”

> Catatan penting: Ini membantu kualitas & konsistensi akademik. Jangan jadikan klaim “anti-deteksi” sebagai jaminan; lebih aman posisikan sebagai “humanize writing quality”.

---

## Komponen pendukung yang paling pas untuk kasus kamu

### 1) **Markdown + sitasi parsing (bukan NLP): remark/markdown-it**

Ini justru “kunci” buat escape clause kamu: **jangan ubah struktur** dan **jangan rusak citation keys**. Untuk itu, yang paling benar adalah parsing **AST markdown** (heading/list/link/code/blockquote) sebelum teks masuk prompt, lalu hanya kirim “text nodes” ke LLM. (Ini bukan dari web source, tapi best practice engineering yang langsung nyambung ke requirement kamu.)

### 2) Sentence splitting / tokenization yang stabil: **Stanza (untuk tokenization & sentence segmentation)**

Kalau kamu butuh pemecahan kalimat yang lebih “linguistically aware” dibanding regex biasa, Stanza menyediakan pipeline multi-bahasa termasuk Indonesian. ([Stanford NLP][2])
Namun, untuk Indonesian ada catatan bahwa **lemmatization** pernah bermasalah/terbatas. Jadi gunakan Stanza terutama untuk **tokenize/sentence split/POS** (kalau perlu), bukan bergantung pada lemma. ([GitHub][3])

### 3) Stemming (opsional, kalau kamu butuh): **Sastrawi**

Sastrawi adalah stemmer Indonesia yang sangat dikenal. Versi PHP repo utamanya ditandai *inactive* ([GitHub][4]), tapi ada port Python (PySastrawi) ([GitHub][5]) dan port JS (SastrawiJs) ([GitHub][6]).
Untuk Refrasa, stemming **biasanya opsional** (karena kamu LLM-first). Paling berguna kalau kamu ingin deteksi pengulangan kata dasar secara heuristik.

---

## Rekomendasi final sesuai arsitektur Refrasa kamu

Kalau aku harus pilih “yang tepat” *tanpa bikin sistem kamu jadi berat/rumit*, ini pilihan paling pas:

1. **Markdown AST parser (remark/markdown-it)** → *proteksi struktur + citation keys (wajib)*
2. **Transformers + IndoBERT backbone (IndoBenchmark) fine-tuned NER** → *proteksi named entities & istilah yang tidak boleh diparafrase sembarangan* ([Hugging Face][1])
3. (Opsional) **Stanza** hanya untuk **sentence segmentation** yang lebih rapi jika kamu butuh analisis pola kalimat per-sentence ([Stanford NLP][2])
4. (Opsional) **SastrawiJs / PySastrawi** untuk heuristik repetisi berbasis stem ([GitHub][6])

### Kenapa ini “paling tepat” untuk kamu?

* Escape clause kamu menuntut **struktur & entitas aman** → parsing markdown + NER adalah pasangan paling efektif.
* Kamu tidak butuh “toolkit NLP klasik serba ada” (stopword/stemming/POS lengkap) karena rewriting utamanya sudah LLM.
* IndoBERT/Transformers itu paling unggul untuk “pemahaman” teks Indonesia modern dibanding library lama yang rule-based. ([Hugging Face][1])

---

Kalau kamu kasih tahu stack runtime kamu (semua Node di Vercel? atau kamu bisa jalankan microservice Python), aku bisa kasih **rancangan implementasi yang paling realistis** (mis. NER via Python service atau ONNX/transformers.js) + bagaimana hasil NER dipakai untuk “do-not-touch spans” di prompt builder.

[1]: https://huggingface.co/indobenchmark/indobert-base-p1?utm_source=chatgpt.com "indobenchmark/indobert-base-p1"
[2]: https://stanfordnlp.github.io/stanza/available_models.html?utm_source=chatgpt.com "Available Models & Languages - Stanza"
[3]: https://github.com/stanfordnlp/stanza/issues/1003?utm_source=chatgpt.com "Lemmatization does not appear to be working for ..."
[4]: https://github.com/sastrawi/sastrawi?utm_source=chatgpt.com "sastrawi/sastrawi: [Inactive] High quality stemmer library ..."
[5]: https://github.com/har07/PySastrawi?utm_source=chatgpt.com "har07/PySastrawi: Indonesian stemmer. Python port ..."
[6]: https://github.com/damzaky/sastrawijs?utm_source=chatgpt.com "damzaky/sastrawijs: Indonesian language stemmer. ..."
