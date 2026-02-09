"""Render annotations onto images."""

import io
from PIL import Image, ImageDraw, ImageFont

# Severity color mapping
SEVERITY_COLORS: dict[int, tuple[int, int, int]] = {
    1: (34, 197, 94),
    2: (234, 179, 8),
    3: (249, 115, 22),
    4: (239, 68, 68),
}

DEFAULT_COLOR: tuple[int, int, int] = (255, 0, 0)

SEVERITY_LABELS: dict[int, str] = {
    1: "Good",
    2: "Fair",
    3: "Poor",
    4: "Severe",
}

DAMAGE_LABELS: dict[str, str] = {
    "CR": "Cracking",
    "SP": "Spalling",
    "CO": "Corrosion",
    "LO": "Loss of Section",
    "DE": "Delamination",
    "BG": "Bulging",
    "CF": "Collision/Fire",
    "RS": "Rust Staining",
}


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Load font with fallback."""
    try:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size)
    except (OSError, IOError):
        return ImageFont.load_default()


def _build_label(annotation: dict) -> str:
    """Build compact annotation label."""
    parts: list[str] = []
    damage_code = annotation.get("damage_type")
    if damage_code:
        parts.append(damage_code)

    severity = annotation.get("severity")
    if severity:
        sev_label = SEVERITY_LABELS.get(severity, "")
        parts.append(f"Sev {severity}" + (f" ({sev_label})" if sev_label else ""))

    component = annotation.get("component")
    if component:
        # Support both legacy string and new list format
        if isinstance(component, list):
            parts.append(", ".join(component))
        else:
            parts.append(component)

    return " | ".join(parts) if parts else ""


def render_annotations(image_bytes: bytes, annotations: list[dict]) -> bytes:
    """Draw annotations, return JPEG bytes."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw_overlay = ImageDraw.Draw(overlay)
    draw_solid = ImageDraw.Draw(img)

    # Scale font and stroke
    img_diag = (img.width ** 2 + img.height ** 2) ** 0.5
    stroke_width = max(2, int(img_diag / 500))
    font_size = max(12, int(img_diag / 80))
    font = _load_font(font_size)

    for annot in annotations:
        bbox = annot.get("bbox", {})
        x = bbox.get("x", 0)
        y = bbox.get("y", 0)
        w = bbox.get("width", 0)
        h = bbox.get("height", 0)

        severity = annot.get("severity")
        rgb = SEVERITY_COLORS.get(severity, DEFAULT_COLOR) if severity else DEFAULT_COLOR
        fill_rgba = (*rgb, 38)    # ~15% opacity (38/255 ≈ 0.149)
        stroke_rgba = (*rgb, 204) # ~80% opacity (204/255 ≈ 0.800)

        shape_type = annot.get("shape_type", "rect")

        if shape_type == "ellipse":
            draw_overlay.ellipse(
                [x, y, x + w, y + h],
                fill=fill_rgba,
                outline=stroke_rgba,
                width=stroke_width,
            )
        else:
            draw_overlay.rectangle(
                [x, y, x + w, y + h],
                fill=fill_rgba,
                outline=stroke_rgba,
                width=stroke_width,
            )

        # Draw label above shape
        label = _build_label(annot)
        if label:
            text_bbox = font.getbbox(label)
            text_w = text_bbox[2] - text_bbox[0]
            text_h = text_bbox[3] - text_bbox[1]
            padding = 4
            label_x = x
            label_y = y - text_h - padding * 2 - 2
            if label_y < 0:
                label_y = y + h + 2  # put below if no room above

            # Label background fill
            draw_overlay.rectangle(
                [label_x, label_y, label_x + text_w + padding * 2, label_y + text_h + padding * 2],
                fill=(*rgb, 200),
            )
            draw_solid_overlay = ImageDraw.Draw(overlay)
            draw_solid_overlay.text(
                (label_x + padding, label_y + padding),
                label,
                fill=(255, 255, 255, 255),
                font=font,
            )

    # Composite and convert
    img = Image.alpha_composite(img, overlay)
    img = img.convert("RGB")

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=92)
    return buf.getvalue()
