# T11 Observation Log — 2026-04-10

## Purpose

T11 is a non-blocking observation test for the known residual limitation in Risk 7f: a file uploaded mid-conversation may be ignored if the runtime does not explicitly treat it as a "new attachment this turn" event.

Per the fix plan, the goal here is not to gate release. The goal is to measure whether the deployed dev behavior still acknowledges, summarizes, and integrates a newly attached file when the upload happens after the first turn.

## Protocol

- Environment: dev app on `http://localhost:3000`
- Deployment target under test: `wary-ferret-59`
- File used in every attempt: `/tmp/attachment-awareness-smoke/t2-medium-reference.pdf`
- First turn pattern: fresh conversation, click template `Diskusi dulu sebelum bikin paper!`
- Second turn pattern: upload the file, then send `Oke, nih gue lampirkan.`
- Measured fields per attempt:
  - `mention_file_name`
  - `summarize_content`
  - `integrate_into_turn`

## Results

| Attempt | Conversation URL | mention_file_name | summarize_content | integrate_into_turn | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `http://localhost:3000/chat/j578yhepbr4sgvsjd0ecyy4k6d84jmz5` | YES | YES | YES | Reused fresh T8 conversation after first turn without attachment. |
| 2 | `http://localhost:3000/chat/j57dt8382myyw4k46z4gg8yg5h84keq2` | YES | YES | YES | Fresh paper-mode conversation. |
| 3 | `http://localhost:3000/chat/j57c54x7qcb4d45whh93x2mgrd84km1t` | YES | YES | YES | Fresh paper-mode conversation. |
| 4 | `http://localhost:3000/chat/j57a4nvjz3ybj3h5m475zv4p1h84jqxe` | YES | YES | YES | Fresh paper-mode conversation. |
| 5 | `http://localhost:3000/chat/j5771rfx1jb9g2d5147j037cx184khnp` | YES | YES | YES | Fresh paper-mode conversation. |

## Evidence Snippets

### Attempt 1

- File name mention: `Oke, gue udah lihat file t2-medium-reference.pdf`
- Integration evidence: `File ini sangat relevan dengan ide kasar kamu ...`

### Attempt 2

- File name mention: `Oke, sudah aku terima file kamu. t2-medium-reference.pdf`
- Summary evidence: `File ini sepertinya adalah contoh atau referensi penelitian ... mixed methods ...`
- Integration evidence: `File ini sangat relevan untuk tahap "Gagasan Paper" kita`

### Attempt 3

- File name mention: `Siap! Aku lihat kamu melampirkan file t2-medium-reference.pdf.`
- Summary evidence: `File ini tampaknya adalah contoh atau referensi paper ... mixed methods ...`
- Integration evidence: `File ini sangat relevan untuk tahap "Gagasan Paper" kita karena bisa jadi inspirasi topik ...`

### Attempt 4

- File name mention: `Aku udah cek file t2-medium-reference.pdf yang kamu upload.`
- Summary evidence: `... penelitian ... pengaruh integrasi Artificial Intelligence ... metodologinya menggunakan mixed methods ...`
- Integration evidence: `File ini sangat relevan untuk tahap Gagasan Paper kita, karena bisa jadi referensi awal atau bahkan inspirasi untuk ide penelitian kamu ...`

### Attempt 5

- File name mention: `Oke, sudah gue terima file t2-medium-reference.pdf kamu.`
- Summary evidence: `... contoh penelitian ... dampak penggunaan AI generatif ... dengan metodologi mixed methods ...`
- Integration evidence: `File ini sangat relevan untuk tahap Gagasan Paper kita, karena bisa jadi inspirasi ide awal atau referensi utama ...`

## Summary

- Attempts run: `5`
- File name mentioned: `5/5`
- File content summarized: `5/5`
- File integrated into the turn: `5/5`
- Severe limitation threshold check: `NOT TRIGGERED`

## Conclusion

Observed dev behavior on 2026-04-10 does not show the Risk 7f limitation in these five attempts. T11 remains non-blocking by design, but the measured result for this run is favorable.
