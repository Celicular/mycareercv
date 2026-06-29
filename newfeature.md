
# Template Ingestion Pipeline
## Converting an Image or PDF of a Resume into a Fabric.js Canvas Template

---

## Overview

This document defines the complete, step-by-step algorithm for converting an uploaded photograph or PDF of a resume template into a valid `fabric_json` object that can be directly loaded into the MyCareerCV Template Editor canvas — with all elements accurately positioned, styled, and binding-annotated.

The pipeline has **7 distinct stages**. Each stage has a clear input, a clearly defined process, a clearly defined output, and a defined dependency on the stages before and after it.

```
INPUT: Image or PDF file
  │
  ▼
[STAGE 1] File Normalisation
  │  → Canonical high-resolution PNG
  ▼
[STAGE 2] Layout Detection (NVIDIA NIM)
  │  → Bounding boxes with element type labels
  ▼
[STAGE 3] OCR + Visual Property Extraction
  │  → Text content + colors + font estimates per element
  ▼
[STAGE 4] Semantic Classification & Binding Inference (Vision LLM)
  │  → Each element annotated with a customMeta.binding
  ▼
[STAGE 5] Coordinate Mapping
  │  → Pixel coords → Fabric.js canvas coords (595×842)
  ▼
[STAGE 6] fabric_json Assembly
  │  → Valid, loadable fabric_json string
  ▼
[STAGE 7] Confidence Review & Human Correction
  │  → Editor loaded with flagged uncertain elements highlighted
  ▼
OUTPUT: Template saved to database via PUT /api/templates/
```

---

## Stage 1 — File Normalisation

### Why This Stage Exists

The AI models downstream (layout detection, OCR, vision LLM) all require a consistent, high-resolution raster image as input. PDFs are vector documents — they are not images. Phone photos may be rotated, compressed, or have inconsistent DPI. If we feed inconsistent input to the models, we get inconsistent and unreliable output. This stage ensures every subsequent stage always receives the exact same type of input regardless of what the user uploads.

### What It Requires

- The raw uploaded file (accepted MIME types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`)
- A PDF renderer (e.g. `pdf2image` Python library, which wraps `poppler`)
- An image processing library (e.g. `Pillow`)

### How It Works

```
if file is PDF:
    → Render page 1 only at 300 DPI using pdf2image
    → This produces a lossless, high-resolution PIL Image object

if file is image (JPG/PNG/WEBP):
    → Load into Pillow
    → Auto-detect and correct EXIF rotation (phones embed rotation in metadata)
    → Resample to 300 DPI if below this threshold

→ Convert to RGB colour space (strip alpha channels, which confuse OCR)
→ Save as a canonical PNG: /tmp/ingestion/{job_id}/source.png
→ Record image dimensions: (source_width_px, source_height_px)
```

**Why 300 DPI specifically?** At 300 DPI, an A4 page becomes 2480×3508 pixels. This is the minimum resolution at which OCR engines reliably detect character-level detail and where layout detection models can distinguish closely packed elements like two-column resume layouts.

### Output

```json
{
  "canonical_image_path": "/tmp/ingestion/job_abc/source.png",
  "source_width_px": 2480,
  "source_height_px": 3508,
  "source_dpi": 300,
  "original_format": "pdf"
}
```

### How It Affects Later Stages

Every pixel coordinate produced by Stage 2 and Stage 3 is expressed relative to `source_width_px` and `source_height_px`. Stage 5 (Coordinate Mapping) uses these exact dimensions to calculate the correct scaling ratios to the Fabric.js canvas. If this stage produced an inconsistent or wrong resolution, all coordinates downstream would be wrong.

---

## Stage 2 — Layout Detection

### Why This Stage Exists

Before we can read text or extract colours, we need to know **where** the elements are. A resume is a structured document with distinct visual regions — a name header, a contact bar, a divider line, section headings, body text blocks, and decorative shapes. Layout detection identifies each of these regions as a bounding box with a semantic label, without needing to understand the actual text content yet.

This is a **computer vision** problem, not a language problem. A specialised layout model is far more reliable than asking a general LLM to "find all the text boxes."

### What It Requires

- The canonical PNG from Stage 1
- **NVIDIA NIM model**: `nvidia/nv-docdetect` or an equivalent document layout detection model (based on `LayoutLMv3` or `Detectron2` architectures, fine-tuned on document datasets like PubLayNet and DocLayNet)
- The NIM inference endpoint URL and API key

### How It Works

The canonical image is sent to the NVIDIA NIM layout detection endpoint via a REST API call:

```python
import base64, requests

with open("/tmp/ingestion/job_abc/source.png", "rb") as f:
    image_b64 = base64.b64encode(f.read()).decode()

response = requests.post(
    "https://ai.api.nvidia.com/v1/cv/nvidia/nv-docdetect",
    headers={"Authorization": f"Bearer {NIM_API_KEY}"},
    json={"image": image_b64}
)

detections = response.json()["objects"]
```

The model returns a list of detected regions. Each detection contains:

- `label` — the semantic type of the region (e.g. `"text"`, `"title"`, `"figure"`, `"table"`, `"separator"`)
- `bounding_box` — the pixel coordinates: `[x_min, y_min, x_max, y_max]`
- `confidence` — a float between 0 and 1 indicating the model's certainty

**Post-processing rules applied after detection:**

1. **Confidence threshold**: Discard any detection with `confidence < 0.65`. Below this threshold, the bounding box is likely overlapping or misidentified.
2. **Minimum area filter**: Discard boxes smaller than 10×2 pixels — these are rendering artefacts, not real elements.
3. **Deduplication**: If two boxes overlap by more than 80% of their area (IoU > 0.8), keep only the higher-confidence one.
4. **Separator detection**: Horizontal rectangles with aspect ratio > 20:1 and height < 5px are classified as `"separator"` (divider lines) regardless of the model label.

### Output

A structured list of detected regions:

```json
[
  {
    "id": "el_001",
    "label": "title",
    "bbox_px": [120, 80, 900, 160],
    "confidence": 0.97
  },
  {
    "id": "el_002",
    "label": "text",
    "bbox_px": [120, 175, 700, 210],
    "confidence": 0.91
  },
  {
    "id": "el_003",
    "label": "separator",
    "bbox_px": [120, 220, 2360, 224],
    "confidence": 0.88
  },
  {
    "id": "el_004",
    "label": "text",
    "bbox_px": [120, 240, 1100, 320],
    "confidence": 0.85
  }
]
```

### How It Affects Later Stages

This is the structural backbone of the entire pipeline. Every subsequent stage operates on the elements defined here. Stage 3 crops the image to each bounding box to read text and sample colours. Stage 4 uses the labels from here to understand what kind of element it is. Stage 5 converts the `bbox_px` coordinates into Fabric.js positions. **If layout detection misses an element or misdraws a bounding box, that element will be absent or mispositioned in the final canvas.** This is why the confidence threshold and post-processing rules are critical.

---

## Stage 3 — OCR and Visual Property Extraction

### Why This Stage Exists

Layout detection tells us *where* elements are and their approximate *type*, but it tells us nothing about what the text says, what colour it is, what font size it appears to be, or whether it is bold. This stage fills in all those visual properties for every element detected in Stage 2. It is the most data-dense stage of the pipeline.

### What It Requires

- The canonical PNG from Stage 1
- The detected elements list from Stage 2
- **NVIDIA NIM OCR model**: `nvidia/ocdrnet` — NVIDIA's end-to-end OCR model, which handles both text detection and recognition in a single pass
- **Pillow** for pixel-level colour sampling
- An optional font classifier (a simple CNN trained on rendered font samples, or heuristic-based)

### How It Works

For each detected element from Stage 2, the following sub-processes run:

---

#### 3a. Text Extraction (OCR)

The canonical image is cropped to the element's bounding box, and that crop is sent to the NIM OCR endpoint:

```python
from PIL import Image

img = Image.open("/tmp/ingestion/job_abc/source.png")

for element in detections:
    x1, y1, x2, y2 = element["bbox_px"]
    crop = img.crop((x1, y1, x2, y2))
    crop.save(f"/tmp/ingestion/job_abc/crops/{element['id']}.png")

    response = requests.post(
        "https://ai.api.nvidia.com/v1/cv/nvidia/ocdrnet",
        json={"image": base64_encode(crop)}
    )
    element["text"] = response.json()["text"]
    element["word_boxes"] = response.json()["word_bounding_boxes"]
    # word_boxes: list of {word, bbox_relative_to_crop}
```

`word_boxes` is important — it tells us the precise positions of individual words within the element, which is needed to detect multi-line text blocks and their internal alignment.

---

#### 3b. Font Size Estimation

Because we know the physical dimensions of the crop (in pixels at 300 DPI), we can estimate font size:

```
cap_height_px  = average height of uppercase letters in the crop (from OCR word_boxes)
font_size_pt   = (cap_height_px / 300) * 72
```

This is a heuristic. It is accurate to within ±2pt for most fonts at standard resume sizes (8pt–36pt).

**Font weight detection:** We calculate the average pixel intensity within each character's bounding region. Bold characters have a higher ink density (lower average brightness). A threshold of < 160/255 mean brightness classifies text as `fontWeight: "bold"`.

**Text alignment detection:** Given the `word_boxes` for a multi-line text element, we compare the left-edge x-positions of each line. If they are all within 3px of each other → `"left"`. If they cluster around the centre of the bounding box → `"center"`. If they right-align → `"right"`.

---

#### 3c. Colour Sampling

We sample the fill colour of each element using two strategies depending on the element type:

**For text elements:** Sample the colour of the darkest pixels within the element crop (text pixels are the darkest). We take the 5th percentile of all pixel brightness values and sample those pixel colours, then average them to get the text colour.

```python
import numpy as np

crop_array = np.array(crop.convert("RGB"))
brightness = crop_array.mean(axis=2)  # per-pixel brightness
dark_mask = brightness < np.percentile(brightness, 5)
dark_pixels = crop_array[dark_mask]
text_color_rgb = dark_pixels.mean(axis=0).astype(int)
text_color_hex = "#{:02X}{:02X}{:02X}".format(*text_color_rgb)
```

**For shapes/rectangles/separators:** Sample the median pixel colour of the entire element crop. Shapes have a uniform fill, so the median is extremely stable.

**Background:** Sample the most common colour in the margins around each element. This tells us the page background colour, which becomes the `background` field of `fabric_json`.

---

#### 3d. Shape-Specific Properties

For elements labelled as `"figure"` or where OCR returns empty text:
- Calculate `width` and `height` from the bounding box
- Record `fill` from the colour sample
- Do not attempt any further text processing

---

### Output

Each element from Stage 2 is now enriched with extracted properties:

```json
[
  {
    "id": "el_001",
    "label": "title",
    "bbox_px": [120, 80, 900, 160],
    "confidence": 0.97,
    "text": "John Doe",
    "font_size_pt": 24.0,
    "font_weight": "bold",
    "text_align": "left",
    "fill_hex": "#222222"
  },
  {
    "id": "el_003",
    "label": "separator",
    "bbox_px": [120, 220, 2360, 224],
    "confidence": 0.88,
    "text": "",
    "fill_hex": "#FF5A36"
  }
]
```

### How It Affects Later Stages

This data is the direct source for the visual properties (`fontSize`, `fontWeight`, `fill`, `textAlign`) of every Fabric.js object produced in Stage 6. Inaccuracies here (wrong colour sample, wrong font size estimate) produce a canvas that looks different from the original. The `text` value is also fed to Stage 4 as a critical input for semantic binding inference — the model needs to read "john.doe@email.com" to know it is an email field.

---

## Stage 4 — Semantic Classification and Binding Inference

### Why This Stage Exists

The previous stages tell us what elements look like and where they are, but they do not know what the text *means*. The MyCareerCV template system requires every element to have a `customMeta.binding` — a semantic pointer like `personal.fullName` or `experience[0].title`. Without bindings, the template is just a static image, not a dynamic resume generator.

This stage uses a **Vision Large Language Model** to look at the full canvas image, read the extracted text from every element, and infer the correct binding for each one based on a defined binding schema.

### What It Requires

- The canonical PNG from Stage 1 (the full resume image, for visual context)
- The enriched elements list from Stage 3 (with text content and positions)
- The binding schema (the complete list of valid `customMeta.binding` values your system supports)
- **NVIDIA NIM Vision LLM**: `nvidia/llama-3.2-90b-vision-instruct` or `meta/llama-3.2-11b-vision-instruct`

### The Binding Schema

Before calling the model, we must define and pass in the complete schema of valid bindings. This is a fixed application-level definition:

```json
{
  "personal": ["fullName", "email", "phone", "address", "linkedin", "website", "title", "summary"],
  "experience": ["company", "title", "startDate", "endDate", "location", "description"],
  "education": ["institution", "degree", "field", "startDate", "endDate", "gpa"],
  "skills": ["name", "level"],
  "languages": ["name", "proficiency"],
  "projects": ["name", "description", "url"],
  "certifications": ["name", "issuer", "date"],
  "static": "A non-dynamic label — text that is always the same regardless of who uses the template (e.g. section headings like 'EXPERIENCE', decorative text, or dividers)"
}
```

### How It Works

We construct a structured prompt that gives the vision LLM both the image and the extracted element list, and instruct it to return a binding assignment for every element:

```python
elements_summary = "\n".join([
    f"ID: {el['id']} | Label: {el['label']} | Text: '{el['text']}' | "
    f"Position: top={el['bbox_px'][1]}px, left={el['bbox_px'][0]}px"
    for el in enriched_elements
])

system_prompt = """
You are a resume layout analyst. Your job is to analyse a resume image and a list of
detected text elements, and assign the correct data binding to each element.

You will be given:
1. The full resume image
2. A list of elements with their detected text and position
3. A binding schema of valid binding values

For each element, you must output a JSON object with:
- "id": the element ID
- "binding": the binding from the schema (use dot notation for nested fields,
   array notation for repeatable sections: experience[0].title, experience[1].title)
- "is_static": true if this element is a section header or label that never changes
- "confidence": your confidence in this binding assignment (0.0 to 1.0)
- "reasoning": one short sentence explaining your decision

Rules:
- Use experience[0], experience[1], experience[2] etc. for multiple experience blocks
- Never invent bindings outside the provided schema
- If you are genuinely uncertain, set confidence < 0.7 and explain why
- Section headers like "WORK EXPERIENCE" or "EDUCATION" are static (is_static: true)
- Decorative shapes and lines have no binding (binding: null, is_static: true)

Respond ONLY with a JSON array. No preamble, no markdown fences.
"""

user_prompt = f"""
Binding schema:
{json.dumps(BINDING_SCHEMA, indent=2)}

Detected elements:
{elements_summary}

Assign a binding to each element.
"""

response = requests.post(
    "https://ai.api.nvidia.com/v1/chat/completions",
    headers={"Authorization": f"Bearer {NIM_API_KEY}"},
    json={
        "model": "meta/llama-3.2-90b-vision-instruct",
        "messages": [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{image_b64}"}},
                    {"type": "text", "text": user_prompt}
                ]
            }
        ],
        "max_tokens": 4096,
        "temperature": 0.1  # Low temperature = deterministic, factual output
    }
)

bindings = json.loads(response.json()["choices"][0]["message"]["content"])
```

**Why temperature 0.1?** Binding inference is a classification task, not a creative task. We want the most probable, consistent answer, not a varied one.

### Handling Repeatable Sections

A resume template often has 2–3 experience blocks. The LLM will label them `experience[0].title`, `experience[1].title`, etc. We then count the maximum index used per section type to produce the `templateMetadata.instanceCounts` object:

```python
instance_counts = {}
for binding_result in bindings:
    binding = binding_result.get("binding", "")
    import re
    match = re.search(r"(\w+)\[(\d+)\]", binding)
    if match:
        section = match.group(1)
        index = int(match.group(2))
        instance_counts[section] = max(instance_counts.get(section, 0), index + 1)

# Result: {"experience": 3, "education": 2}
```

### Output

Each element now has a `customMeta` annotation:

```json
[
  {
    "id": "el_001",
    "binding": "personal.fullName",
    "is_static": false,
    "confidence": 0.98,
    "reasoning": "Large bold text at the very top of the resume is the candidate's name."
  },
  {
    "id": "el_003",
    "binding": null,
    "is_static": true,
    "confidence": 0.99,
    "reasoning": "Horizontal coloured line is a decorative separator with no data binding."
  },
  {
    "id": "el_007",
    "binding": "experience[0].title",
    "is_static": false,
    "confidence": 0.72,
    "reasoning": "Bold text within experience block, appears to be a job title."
  }
]
```

Elements with `confidence < 0.70` are flagged for human review in Stage 7.

### How It Affects Later Stages

This is the stage that makes the template *functional*, not just decorative. The `binding` value from this stage becomes `customMeta.binding` in every Fabric.js object in Stage 6. The `instance_counts` goes directly into `templateMetadata.instanceCounts`. Without this stage, the canvas would load correctly but would be a static image that could not generate personalised resumes.

---

## Stage 5 — Coordinate Mapping

### Why This Stage Exists

All bounding boxes so far are expressed in **source image pixels** (e.g. a 2480×3508 pixel PNG at 300 DPI). The Fabric.js canvas in MyCareerCV uses a fixed coordinate system of **595×842 units** (standard A4 dimensions in points, at 96 DPI display scaling). These two coordinate systems must be precisely reconciled before any Fabric.js objects can be created. Incorrect mapping means every element lands in the wrong position on the canvas.

### What It Requires

- The `source_width_px` and `source_height_px` from Stage 1
- The enriched, annotated elements list from Stages 3 and 4
- The known Fabric.js canvas dimensions: `CANVAS_WIDTH = 595`, `CANVAS_HEIGHT = 842`

### How It Works

The mapping is a straightforward proportional scaling:

```python
CANVAS_WIDTH = 595
CANVAS_HEIGHT = 842

scale_x = CANVAS_WIDTH / source_width_px
scale_y = CANVAS_HEIGHT / source_height_px

def map_coords(bbox_px, source_w, source_h):
    x1, y1, x2, y2 = bbox_px
    left   = x1 * scale_x
    top    = y1 * scale_y
    width  = (x2 - x1) * scale_x
    height = (y2 - y1) * scale_y
    return {
        "left":   round(left, 2),
        "top":    round(top, 2),
        "width":  round(width, 2),
        "height": round(height, 2)
    }
```

**Font size also needs scaling.** Font sizes were estimated in points at 300 DPI physical resolution. Fabric.js renders at 96 DPI screen resolution. We apply a DPI correction:

```python
def scale_font_size(font_size_pt):
    # Fabric.js 1pt ≈ 1.33px at 96dpi. We use the canvas scale to keep proportions.
    # Empirically: fontSize in Fabric.js ≈ source_pt * (CANVAS_HEIGHT / source_height_inches)
    source_height_inches = source_height_px / 300
    return round(font_size_pt * (CANVAS_HEIGHT / (source_height_inches * 72)), 2)
```

**Why round to 2 decimal places?** Fabric.js is sensitive to floating-point noise in positioning. Excessive decimal precision causes invisible sub-pixel misalignments that accumulate when multiple objects are stacked.

### Output

Each element now has Fabric.js-ready coordinate and size values:

```json
[
  {
    "id": "el_001",
    "fabric_left": 28.79,
    "fabric_top": 19.19,
    "fabric_width": 186.29,
    "fabric_height": 19.19,
    "fabric_font_size": 20.5
  }
]
```

### How It Affects Later Stages

These values are used verbatim as `left`, `top`, `width`, `height`, and `fontSize` in each Fabric.js object in Stage 6. This is the stage where physical layout precision is established. Any rounding error introduced here is directly visible in the canvas as misaligned elements.

---

## Stage 6 — fabric_json Assembly

### Why This Stage Exists

All previous stages have gathered every piece of information needed to describe the template. This stage synthesises all of that data into a single, valid `fabric_json` string that your existing `TemplateCanvas.jsx` can load directly using `canvas.loadFromJSON()` — no special handling required.

### What It Requires

- All enriched, annotated, and coordinate-mapped elements from Stages 2–5
- The `instance_counts` from Stage 4
- The page background colour sampled in Stage 3
- Knowledge of the Fabric.js JSON schema (version 5.3.0)

### How It Works

We iterate through all elements and construct the appropriate Fabric.js object for each one, based on the element's `label` from Stage 2:

```python
def build_fabric_object(element):
    label = element["label"]
    coords = element["fabric_coords"]  # from Stage 5
    binding = element["binding"]       # from Stage 4
    is_static = element["is_static"]

    base = {
        "version": "5.3.0",
        "originX": "left",
        "originY": "top",
        "left":   coords["left"],
        "top":    coords["top"],
        "width":  coords["width"],
        "height": coords["height"],
        "selectable": True,
        "hasControls": True
    }

    if label in ("title", "text") and element.get("text"):
        obj = {
            **base,
            "type": "textbox",
            "text": element["text"],
            "fill": element["fill_hex"],
            "fontFamily": "Inter",
            "fontSize": element["fabric_font_size"],
            "fontWeight": element["font_weight"],
            "textAlign": element["text_align"],
            "customMeta": {
                "binding": binding if not is_static else None,
                "placeholder": element["text"],
                "isStatic": is_static
            }
        }

    elif label == "separator":
        obj = {
            **base,
            "type": "rect",
            "fill": element["fill_hex"],
            "rx": 0,
            "ry": 0,
            "customMeta": {
                "binding": None,
                "isStatic": True
            }
        }

    elif label == "figure":
        obj = {
            **base,
            "type": "rect",
            "fill": element["fill_hex"],
            "customMeta": {
                "binding": binding,
                "isStatic": is_static
            }
        }

    else:
        # Fallback: treat as static textbox
        obj = {
            **base,
            "type": "textbox",
            "text": element.get("text", ""),
            "fill": element.get("fill_hex", "#333333"),
            "fontFamily": "Inter",
            "fontSize": 10,
            "customMeta": {"binding": None, "isStatic": True}
        }

    return obj
```

**Font family note:** We currently default all text to `"Inter"` since it is the primary font loaded in the editor. A future enhancement would match the original font using a font classifier. For now, `fontWeight: "bold"` and `fontSize` carry most of the visual weight.

Once all objects are built, the final `fabric_json` is assembled:

```python
fabric_json = {
    "version": "5.3.0",
    "objects": [build_fabric_object(el) for el in all_elements],
    "background": background_hex,
    "templateMetadata": {
        "instanceCounts": instance_counts,
        "ingestionSource": "image_upload",
        "ingestionConfidences": {
            el["id"]: el["confidence"] for el in all_elements
        }
    }
}

fabric_json_string = json.dumps(fabric_json)
```

**Why store `ingestionConfidences` in `templateMetadata`?** This allows Stage 7 and the frontend to know exactly which elements had low-confidence binding assignments, and highlight them for the user to review.

### Output

A complete, valid `fabric_json` string, for example:

```json
{
  "version": "5.3.0",
  "objects": [
    {
      "type": "textbox",
      "version": "5.3.0",
      "originX": "left",
      "originY": "top",
      "left": 28.79,
      "top": 19.19,
      "width": 186.29,
      "height": 19.19,
      "fill": "#222222",
      "fontFamily": "Inter",
      "fontSize": 20.5,
      "fontWeight": "bold",
      "text": "John Doe",
      "textAlign": "left",
      "customMeta": {
        "binding": "personal.fullName",
        "placeholder": "John Doe",
        "isStatic": false
      }
    },
    {
      "type": "rect",
      "version": "5.3.0",
      "originX": "left",
      "originY": "top",
      "left": 28.79,
      "top": 52.74,
      "width": 537.41,
      "height": 0.96,
      "fill": "#FF5A36",
      "customMeta": {
        "binding": null,
        "isStatic": true
      }
    }
  ],
  "background": "#ffffff",
  "templateMetadata": {
    "instanceCounts": {
      "experience": 3,
      "education": 2
    },
    "ingestionSource": "image_upload",
    "ingestionConfidences": {
      "el_001": 0.98,
      "el_003": 0.99,
      "el_007": 0.72
    }
  }
}
```

### How It Affects Later Stages

This is the payload that is stored in the database and loaded into the canvas. Its correctness determines the entire user experience. The canvas will call `canvas.loadFromJSON(fabric_json_string, canvas.renderAll.bind(canvas))` to render it. Any malformed Fabric.js object (missing required field, wrong type name) will silently fail to render — the element simply won't appear.

---

## Stage 7 — Confidence Review and Human Correction

### Why This Stage Exists

No AI pipeline achieves 100% accuracy. Binding inference in particular can be ambiguous — for example, distinguishing between `personal.title` (the person's job title in the header) and `experience[0].title` (a role title in the work history) can confuse even a large vision model. Rather than silently producing a wrong template, this stage surfaces all uncertain decisions to the user in a clear, actionable way.

### What It Requires

- The `fabric_json` from Stage 6 (with `ingestionConfidences` in `templateMetadata`)
- A modification to `TemplateCanvas.jsx` or `PropertiesPanel.jsx` to read confidence values and highlight low-confidence elements
- A confidence threshold constant: `REVIEW_THRESHOLD = 0.70`

### How It Works

**Backend:** A new API endpoint returns the ingestion job result with confidence metadata:

```
GET /api/templates/ingestion/{job_id}/result
→ Returns the fabric_json + a list of element IDs with confidence < 0.70
```

**Frontend — canvas highlighting:** When `TemplateCanvas.jsx` loads the `fabric_json`, it checks `templateMetadata.ingestionConfidences`. For any element with `confidence < REVIEW_THRESHOLD`:

1. The object is given a visible orange dashed border on the canvas (using Fabric.js `stroke` and `strokeDashArray`)
2. A badge reading `⚠ Review Binding` is overlaid near the element
3. Clicking the element opens the `PropertiesPanel` directly on the `customMeta.binding` field with a dropdown showing all valid binding options

**Frontend — review sidebar:** A collapsible "Ingestion Review" panel lists all flagged elements with:
- A thumbnail of the detected region
- The current binding assignment
- A dropdown to change the binding
- A confidence score shown as a visual indicator
- A "Mark as Reviewed" button that removes the flag

Once the user reviews and confirms all flagged elements, a "Looks Good — Save Template" button:
1. Strips `ingestionConfidences` from `templateMetadata` (it's only needed during review)
2. Calls `PUT /api/templates/{id}` with the corrected `fabric_json`
3. Generates a final thumbnail via `canvas.toDataURL()`
4. Saves and redirects to the normal editor

### Output

A fully reviewed, human-confirmed template stored in the `resume_templates` table — indistinguishable from a template created manually in the editor, with all bindings correct and ready for resume generation.

---

## End-to-End Data Flow Summary

```
Stage 1  → canonical_image_path, source_width_px, source_height_px
             ↓
Stage 2  → elements[]: {id, label, bbox_px, confidence}
             ↓
Stage 3  → elements[]: +{text, font_size_pt, font_weight, text_align, fill_hex}
             ↓
Stage 4  → elements[]: +{binding, is_static, confidence, reasoning}
           + instance_counts: {experience: 3, education: 2}
             ↓
Stage 5  → elements[]: +{fabric_left, fabric_top, fabric_width, fabric_height, fabric_font_size}
             ↓
Stage 6  → fabric_json string (ready for canvas.loadFromJSON)
             ↓
Stage 7  → reviewed, corrected template stored in DB
```

---

## Error Handling and Edge Cases

| Scenario | Detection | Resolution |
|---|---|---|
| No elements detected (blank image) | Stage 2 returns empty array | Return HTTP 422 with message "No layout detected. Ensure the image is clear and right-side up." |
| Completely unreadable OCR (e.g. handwriting) | Stage 3 text fields all empty | Flag all elements for manual binding in Stage 7 |
| LLM binding inference times out | Stage 4 API call exceeds 30s timeout | Fall back to rule-based classifier (positional heuristics); flag all elements for review |
| Multi-page PDF uploaded | Stage 1 detects page count > 1 | Process only page 1; warn user "Only the first page of your PDF was processed." |
| Image is a photograph (not a scan) | Stage 1 detects non-white background | Apply contrast enhancement and deskew before Stage 2 |
| Confidence collapse (all < 0.70) | Stage 7 flags all elements | Present user with full manual review; do not auto-save |

---

## Performance Estimates

| Stage | Operation | Estimated Time |
|---|---|---|
| Stage 1 | File normalisation | ~0.5s |
| Stage 2 | NIM layout detection | ~2–4s |
| Stage 3 | OCR (per element, batched) | ~3–6s |
| Stage 4 | Vision LLM binding inference | ~5–10s |
| Stage 5 | Coordinate mapping (in-process) | ~0.05s |
| Stage 6 | JSON assembly (in-process) | ~0.05s |
| **Total** | | **~11–21s** |

This is suitable for a background job with a polling endpoint. The frontend should show a progress spinner with stage labels so the user knows the pipeline is working.

---

## New Backend Endpoint Required

```
POST /api/templates/ingest
  Body: multipart/form-data { file: <image or PDF> }
  → Starts ingestion job, returns { job_id: "abc123" }

GET /api/templates/ingestion/{job_id}/status
  → { status: "pending" | "stage_2" | "stage_4" | "complete" | "failed", progress: 0.0–1.0 }

GET /api/templates/ingestion/{job_id}/result
  → { fabric_json: "...", flagged_elements: ["el_007", ...] }
```