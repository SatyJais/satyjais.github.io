---
layout: page
title: "OCR & AI-Powered Note Processing Pipeline"
description: "Automated pipeline to extract, rephrase, and reformat 20,000+ pages of handwritten care notes using Tesseract OCR, GPT-4o, and Python — built in 3 days for a US NGO"
img: assets/img/ocr-pipeline.png
importance: 2
category: AI & Automation
---

## Overview

A US-based NGO providing nursing and care services for specially-abled adults needed to digitise and reformat thousands of pages of daily care notes into a standardised compliance document format. The work was **entirely manual** — staff were copying notes by hand into Word templates, one page at a time.

I was brought in as a freelancer to automate the entire process end-to-end. The result: **20,000+ pages processed in minutes**, built and iterated over 2 days.

---

## The Problem

Care workers filled out daily notes for each individual they supported. These notes had to be:

1. **Extracted** — pulled from scanned multi-page PDFs with inconsistent formatting
2. **Structured** — key fields (name, date, Medicaid number, times, note body) identified and separated
3. **Rephrased** — the raw note text cleaned up and rewritten in a formal, consistent clinical style
4. **Reformatted** — filled into a standardised DOCX compliance template and exported as PDF

Doing this manually for 20,000+ pages was taking the team weeks. Accuracy was inconsistent, and the process was error-prone.

---

## What I Built

### Pipeline Architecture

Two Python scripts working in sequence — one to extract, one to generate.

<div class="row mt-4 mb-4">
  <div class="col-12">
    {% include figure.liquid loading="eager" path="assets/img/ocr-pipeline.png" class="img-fluid rounded z-depth-2" caption="End-to-end pipeline — Scanned PDFs → OCR → CSV → GPT-4o → Formatted PDF output" %}
  </div>
</div>

---

### Script 1 — `extract_structured_notes_batch_v1.py`

Recursively scans a folder of PDFs, runs OCR on each page, extracts structured fields, and writes per-file CSVs plus a master combined CSV.

**Key steps:**
- Convert each PDF page to a 300 DPI image via `pdf2image`
- Auto-detect and correct page rotation using Tesseract OSD
- Run OCR with `--psm 6 --oem 3` config for block-level text
- Use regex to extract structured fields from raw text
- Remove boilerplate (question headers, signature blocks)
- Fill missing fields using mode-across-pages logic
- Write per-PDF CSV + master `all_notes_combined.csv`

```python
def ocr_page(img, page_num, dump_dir):
    cv_img = np.array(img.convert("RGB"))
    cv_img = auto_rotate(cv_img)
    gray = cv2.cvtColor(cv_img, cv2.COLOR_RGB2GRAY)
    text = pytesseract.image_to_string(gray, lang="eng", config=OCR_CONFIG)
    dump_path = os.path.join(dump_dir, f"page_{page_num}_ocr.txt")
    with open(dump_path, "w", encoding="utf-8") as f:
        f.write(text)
    return text

def auto_rotate(cv_img):
    try:
        osd = pytesseract.image_to_osd(cv_img)
        rot = int(re.search(r"Rotate: (\d+)", osd).group(1))
    except Exception:
        rot = 0
    if rot == 90:
        return cv2.rotate(cv_img, cv2.ROTATE_90_CLOCKWISE)
    elif rot == 180:
        return cv2.rotate(cv_img, cv2.ROTATE_180)
    elif rot == 270:
        return cv2.rotate(cv_img, cv2.ROTATE_90_COUNTERCLOCKWISE)
    return cv_img
```

**Regex-based field extraction** — pulling structured fields from raw OCR text:

```python
def extract_fields_from_text(text):
    fields = {"individual_name": "", "date": "", "medicaid_number": "",
              "time_started": "", "time_ended": ""}

    m = re.search(r"Individual\s*Name[:\s_*-]*([A-Za-z ,.'-]{2,60})", t, re.IGNORECASE)
    if m:
        fields["individual_name"] = re.split(r"\bDate\b", m.group(1).strip())[0].strip()

    m = re.search(r"Medicaid\s*Number[:\s_*-]*([0-9A-Za-z\- ]{4,25})", t, re.IGNORECASE)
    if m:
        val = m.group(1).strip()
        val = re.split(r"\bTime\b|\bDate\b", val)[0].strip()
        fields["medicaid_number"] = val

    m = re.search(r"Time\s*Started[:\s_*-]*([0-9:.apm ]{4,15})", t, re.IGNORECASE)
    if m:
        fields["time_started"] = m.group(1).strip()

    return fields
```

**Mode-fill logic** — if a field is missing on some pages, fills it with the most common value seen across all pages of that PDF:

```python
def fill_missing_common_fields(pages_data):
    for field in ["individual_name", "medicaid_number", "time_started", "time_ended"]:
        vals = [p[field] for p in pages_data if len(p[field]) >= 3]
        if not vals:
            continue
        common = Counter(vals).most_common(1)[0][0]
        for p in pages_data:
            if not p[field] or len(p[field]) < 3:
                p[field] = common
    return pages_data
```

---

### Script 2 — `generate_final_notes_from_csv_rephrase_v3.py`

Reads the extracted CSVs, rephrases each note using GPT-4o, fills a DOCX template, converts to PDF via LibreOffice, and merges all pages into a single output PDF per individual.

**Note cleaning before rephrasing:**

```python
def clean_source_note(raw: str) -> str:
    # Drop the question block if still present in CSV
    text = QUESTION_HEAD_RE.sub("", text)

    # Stop before signature / attestation lines
    lines = text.splitlines()
    keep = []
    for ln in lines:
        if TRAILING_SIGNATURE_RE.search(ln):
            break
        keep.append(ln)
    text = "\n".join(keep)

    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text
```

**GPT-4o rephrasing** — note text is rewritten in a formal, factual clinical tone matched to an example style. The prompt is carefully constrained to prevent hallucination:

```python
REPHRASE_PROMPT = """Rephrase the following paragraph in the same descriptive,
factual (do not add new/imaginary information), and complete style as the example
below. Keep full sentences, natural flow, and ensure it reads as a complete daily
note. Never truncate mid-sentence.

Example style:
{example}

Paragraph to rephrase:
{paragraph}
"""

def rephrase(client, note: str) -> str:
    prompt = REPHRASE_PROMPT.format(example=EXAMPLE_STYLE, paragraph=note.strip())
    resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_completion_tokens=900,
    )
    return (resp.choices[0].message.content or "").strip()
```

**Template filling and PDF generation:**

```python
def fill_template(template_path, fields, rephrased_note, out_docx):
    doc = Document(template_path)

    # Replace placeholders
    replacements = {
        "{{INDIVIDUAL_NAME}}": fields.get("individual_name", ""),
        "{{DATE}}":            fields.get("date", ""),
        "{{MEDICAID_NUMBER}}": fields.get("medicaid_number", ""),
        "{{TIME_STARTED}}":    fields.get("time_started", ""),
        "{{TIME_ENDED}}":      fields.get("time_ended", ""),
    }
    for p in doc.paragraphs:
        for k, v in replacements.items():
            if k in p.text:
                p.text = p.text.replace(k, v)

    # Insert rephrased note after the question block
    for i, p in enumerate(doc.paragraphs):
        if p.text.strip().lower().startswith("what mood was the individual in today"):
            if not doc.paragraphs[i + 1].text.strip():
                doc.paragraphs[i + 1].text = rephrased_note
            else:
                p.insert_paragraph_after(rephrased_note)
            break

    doc.save(out_docx)
```

---

## Iterations & Learnings

This was built across 3 days with multiple rounds of refinement:

- **v1** — Basic OCR + CSV extraction, discovered rotation issues on scanned pages → added `auto_rotate()`
- **v2** — Regex patterns refined as OCR output varied by handwriting style and scanner quality
- **v3** — GPT rephrasing added; prompt tuned to prevent hallucination, constrained with style example and `temperature=0.4`
- **v4** — Signature block and question header removal improved; mode-fill logic for missing fields added
- **Final** — LibreOffice conversion retries added for stability; master CSV and mirrored folder structure finalised

---

## Results

<div class="row mt-3">
  <div class="col-md-3 col-sm-6 mb-3">
    <div class="card h-100 text-center p-3" style="border-left: 4px solid #1d4ed8;">
      <h2 style="color:#1d4ed8; font-size:2rem; font-weight:700;">20,000+</h2>
      <p style="font-size:0.9rem; color:#64748b;">pages processed in minutes</p>
    </div>
  </div>
  <div class="col-md-3 col-sm-6 mb-3">
    <div class="card h-100 text-center p-3" style="border-left: 4px solid #7c3aed;">
      <h2 style="color:#7c3aed; font-size:2rem; font-weight:700;">3 days</h2>
      <p style="font-size:0.9rem; color:#64748b;">end-to-end build with multiple iterations</p>
    </div>
  </div>
  <div class="col-md-3 col-sm-6 mb-3">
    <div class="card h-100 text-center p-3" style="border-left: 4px solid #0d9488;">
      <h2 style="color:#0d9488; font-size:2rem; font-weight:700;">2 scripts</h2>
      <p style="font-size:0.9rem; color:#64748b;">fully automated extract + generate pipeline</p>
    </div>
  </div>
  <div class="col-md-3 col-sm-6 mb-3">
    <div class="card h-100 text-center p-3" style="border-left: 4px solid #ea580c;">
      <h2 style="color:#ea580c; font-size:2rem; font-weight:700;">0 manual</h2>
      <p style="font-size:0.9rem; color:#64748b;">steps — fully hands-off after setup</p>
    </div>
  </div>
</div>

---

## Tech Stack

<div class="row mt-2">
  <div class="col-12">
    <span class="badge" style="background:#1d4ed8; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">Python 3</span>
    <span class="badge" style="background:#1d4ed8; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">Tesseract OCR</span>
    <span class="badge" style="background:#1d4ed8; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">OpenCV</span>
    <span class="badge" style="background:#1d4ed8; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">pdf2image</span>
    <span class="badge" style="background:#7c3aed; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">OpenAI GPT-4o</span>
    <span class="badge" style="background:#0d9488; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">pandas</span>
    <span class="badge" style="background:#ea580c; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">python-docx</span>
    <span class="badge" style="background:#ea580c; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">LibreOffice</span>
    <span class="badge" style="background:#ea580c; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">PyPDF2</span>
    <span class="badge" style="background:#334155; color:white; padding:6px 12px; border-radius:20px; margin:4px; font-size:0.82rem;">regex</span>
  </div>
</div>
