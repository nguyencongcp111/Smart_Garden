# Template execution contract

## Reference

- Authoritative source: `C:/Users/LENOVO/Downloads/Báo cáo BTL môn Nhúng - DH13C8 nhóm 6.docx`
- Read-only retained copy: `C:/2026-27/EmbeddedAndIoT/SmartGarden/remote_web/.docx_work/reference.docx`
- SHA-256: `19F7B730829D8FB4D56EDA4CCBB1F1BC1E78AECE03F7BCCEB7A73B912D787869`
- Size: 39,187,071 bytes
- Render evidence: 62 A4 pages in `.docx_work/reference-word-render`
- Structure evidence: 2 sections, 992 paragraphs, 17 tables, 39 inline and 6 anchored drawings
- Style evidence: `.docx_work/reference-style.json`

## Page system

- A4 portrait, 8.27 x 11.69 inches.
- Left margin 1.18 inches; right, top, and bottom margins 0.79 inches.
- Two continuous sections with identical geometry; second section inherits header and footer.
- No text in headers or footers. No different-first-page or odd/even-page behavior.
- The new report keeps A4 portrait and the same margins. It uses explicit page breaks for cover, lists, chapters, conclusion, references, and appendices.

## Typography

- Body role: Times New Roman, 13 pt, justified, 1.5 line spacing, first-line indent 0.5 inch.
- Document title role: Word `Title`, black, bold, centered, 16 pt, single spacing.
- Chapter title role: source `Title` pattern, black, bold, centered, 16 pt.
- Level 1 role: Word `Heading 1`, black, bold, 14 pt, 18 pt before and 4 pt after, keep with next.
- Level 2 role: Word `Heading 2`, black, bold, 13 pt, 8 pt before and 4 pt after, keep with next.
- Level 3 role: Word `Heading 3`, black, bold italic, 13 pt, 8 pt before and 4 pt after, keep with next.
- Caption role: Word `Caption`, Times New Roman 12 pt, bold italic, centered, 10 pt after, keep with previous.
- Cover: Times New Roman, centered institutional block, bold uppercase report/course/title lines, metadata aligned in a compact two-column table.

## Lists and tables

- Body lists use Word List Paragraph with 0.25 inch left indent and 0.2 inch hanging indent.
- Tables use light gray borders `D9D9D9`, dark blue header fill, white bold header text, vertically centered cells, and alternating pale-blue/white body rows.
- Number and short-value columns are centered; narrative columns are left aligned.
- Rows expand automatically. Tables repeat header rows when they span pages.

## Components and content flow

1. Cover with university, faculty, report type, exact project title, course, lecturer, class, blank student table, place/year.
2. Table of contents, list of figures, and list of tables.
3. Opening section explaining the problem, project scope, deliverables, and report structure.
4. Chapter 1: project rationale, embedded/IoT background, system objectives and scope, hardware components.
5. Chapter 2: requirements, system architecture, electrical and network design, control algorithms, API and chatbot design.
6. Chapter 3: firmware and web implementation, operating procedure, test method, software evidence, and hardware test slots.
7. Chapter 4: achieved functions, evaluation, limitations, risks, and development direction.
8. Conclusion, references, and appendices.

## Figure slots

- Every future image slot is an editable bordered placeholder followed by a real `Caption` paragraph.
- Slots cover: overall model, ESP32, DHT11, soil sensor, MB370 pump, expansion board, power converter, relay, block diagram, wiring diagram, algorithm flowchart, assembled hardware, web weather panel, web ESP32 panel, chatbot recommendation, and test photos.
- Placeholders may be replaced by actual images without changing the caption or section structure.

## Stable locators and intended rewrites

- All original body elements are rewritten because the user requested a different project.
- Page geometry, Times New Roman hierarchy, centered chapter titles, caption treatment, table rhythm, and academic content order are source-derived.
- The reference has empty member rows. Those remain blank in the new report rather than inventing student identities.
- The original lecturer name is retained because the user did not request a change. Course and class are explicitly replaced as requested.
- Original images, relationships, and project-specific text are not copied into the final report. Only the template's layout language and semantic report structure are retained.

## Package preservation and fidelity gates

- Preserve the reference file byte-for-byte.
- Use the reference as the style/page source, but build a new body because every substantive slot changes.
- Final output must remain A4 portrait with the same margins, professional black headings, Times New Roman body, coherent chapter pagination, complete figure/table labels, and no source-project text.
- Final checks: render every page, inspect every page, verify no clipping or orphaned captions, validate all placeholders are intentional, confirm all requested names/components appear, and confirm the final file opens in Word.
