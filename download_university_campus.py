"""Download a representative campus/building PHOTO for each university.

Logos/crests are not what we want here -- we want an actual photo of the
campus. Strategy per university:

1. Ask Wikipedia's `pageimages` API for the article's lead image at a large
   width. For many universities that lead image is already a campus photo.
2. If that lead image is an SVG (i.e. a crest/logo/wordmark, common for the
   older US/UK universities) OR is missing, fall back to the first genuine
   JPEG that appears in the article body (via `action=parse&prop=images`),
   skipping obvious non-photos (logos, seals, flags, maps, icons).
3. Resolve the chosen File: to a rendered JPEG thumbnail and download it to
   ./public/campus/univ-*.jpg so the app can serve it at /campus/univ-*.jpg.

Usage:
    pip install requests
    python download_university_campus.py
"""

import json
import os
import re
import time
import requests

OUTPUT_DIR = os.path.join("public", "campus")
THUMB_WIDTH = 900
MAX_RETRIES = 5

UNIVERSITIES = {
    "univ-mit": "Massachusetts Institute of Technology",
    "univ-oxford": "University of Oxford",
    "univ-harvard": "Harvard University",
    "univ-cambridge": "University of Cambridge",
    "univ-stanford": "Stanford University",
    "univ-ethz": "ETH Zurich",
    "univ-nus": "National University of Singapore",
    "univ-melbourne": "University of Melbourne",
    "univ-tsinghua": "Tsinghua University",
    "univ-toronto": "University of Toronto",
    "univ-tum": "Technical University of Munich",
    "univ-anu": "Australian National University",
    "univ-snu": "Seoul National University",
    "univ-tokyo": "University of Tokyo",
    "univ-heidelberg": "Heidelberg University",
    "univ-leiden": "Leiden University",
    "univ-kuleuven": "KU Leuven",
    "univ-auckland": "University of Auckland",
    "univ-sciencespo": "Sciences Po",
    "univ-uct": "University of Cape Town",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    )
}

API_URL = "https://en.wikipedia.org/w/api.php"

# Minimum seconds between ANY two API/image requests (Wikimedia rate-limits).
MIN_INTERVAL = 1.5
_last_request = [0.0]

# File-name fragments that indicate a non-photo we should skip.
SKIP_PATTERNS = re.compile(
    r"(logo|seal|crest|coat|arms|wordmark|flag|icon|commons|wikimedia|"
    r"map|location|locator|symbol|blank|pog|osm|edit-|wiki\.png|"
    r"question_book|ambox|padlock|portrait|\.ogg|\.oga)",
    re.IGNORECASE,
)
JPEG_RE = re.compile(r"\.(jpe?g)$", re.IGNORECASE)

# Generic words that suggest a filename depicts a campus/building/place.
CAMPUS_KEYWORDS = re.compile(
    r"(campus|university|universit|college|building|hall|library|quad|"
    r"court|tower|dome|aerial|main|gate|square|entrance|facade|centre|"
    r"center|auditorium|schule|universiteit|panorama)",
    re.IGNORECASE,
)

# Words that suggest a filename is a person / portrait / non-place we avoid.
PERSON_KEYWORDS = re.compile(
    r"(portrait|headshot|speech|toast|dinner|conference|press|award|"
    r"medal|signature|stamp|coin|book_cover|poster)",
    re.IGNORECASE,
)

STOPWORDS = {"of", "the", "and", "for", "at", "de", "la", "el"}

SESSION = requests.Session()
SESSION.headers.update(HEADERS)


def _throttle():
    elapsed = time.time() - _last_request[0]
    if elapsed < MIN_INTERVAL:
        time.sleep(MIN_INTERVAL - elapsed)
    _last_request[0] = time.time()


def request_with_retry(url, params=None, stream=False):
    delay = 5.0
    for attempt in range(MAX_RETRIES):
        _throttle()
        resp = SESSION.get(url, params=params, timeout=25, stream=stream)
        if resp.status_code == 429:
            wait = float(resp.headers.get("Retry-After", delay))
            print(f"       429 rate-limited, waiting {wait:.0f}s...")
            time.sleep(wait)
            delay *= 2
            continue
        resp.raise_for_status()
        return resp
    resp.raise_for_status()
    return resp


def lead_image(title):
    """Return (thumburl, is_svg) for the article's lead image, or (None, False)."""
    params = {
        "action": "query",
        "titles": title,
        "prop": "pageimages",
        "format": "json",
        "pithumbsize": THUMB_WIDTH,
        "piprop": "thumbnail|name",
        "redirects": 1,
    }
    resp = request_with_retry(API_URL, params=params)
    page = next(iter(resp.json().get("query", {}).get("pages", {}).values()), {})
    thumb = page.get("thumbnail")
    name = page.get("pageimage", "")
    if not thumb:
        return None, False
    return thumb["source"], name.lower().endswith(".svg")


def best_photo_file(title):
    """Pick the best campus/building JPEG from the article body.

    Scores each candidate JPEG by how many significant tokens of the
    university's name it contains, plus generic campus keywords, minus a
    penalty for person/event words. Article order breaks ties (earlier =
    better). Returns None if nothing qualifies.
    """
    params = {
        "action": "parse",
        "page": title,
        "prop": "images",
        "format": "json",
        "redirects": 1,
    }
    resp = request_with_retry(API_URL, params=params)
    images = resp.json().get("parse", {}).get("images", [])

    name_tokens = [
        t for t in re.split(r"[^a-zA-Z]+", title.lower())
        if len(t) >= 3 and t not in STOPWORDS
    ]

    best = None
    best_score = 0
    for idx, fname in enumerate(images):
        if not JPEG_RE.search(fname) or SKIP_PATTERNS.search(fname):
            continue
        low = fname.lower()
        score = 0
        score += sum(3 for tok in name_tokens if tok in low)
        score += len(CAMPUS_KEYWORDS.findall(low))
        score -= 4 * len(PERSON_KEYWORDS.findall(low))
        # Small nudge toward images appearing earlier in the article.
        score += max(0, 3 - idx * 0.1)
        if score > best_score:
            best_score = score
            best = fname

    # Only trust a positive score; otherwise let the caller fall back.
    return best if best_score > 0 else None


def resolve_thumb(filename, width=THUMB_WIDTH):
    params = {
        "action": "query",
        "titles": f"File:{filename}",
        "prop": "imageinfo",
        "iiprop": "url",
        "iiurlwidth": width,
        "format": "json",
    }
    resp = request_with_retry(API_URL, params=params)
    page = next(iter(resp.json().get("query", {}).get("pages", {}).values()), {})
    info = page.get("imageinfo")
    if not info:
        return None
    return info[0].get("thumburl") or info[0].get("url")


def find_campus_url(title):
    url, is_svg = lead_image(title)
    if url and not is_svg:
        return url, "lead-image"
    # Lead is a crest/logo (svg) or missing -> find a real photo in the body.
    photo = best_photo_file(title)
    if photo:
        resolved = resolve_thumb(photo)
        if resolved:
            return resolved, f"body-photo:{photo}"
    # Last resort: use whatever the lead was, even if svg.
    if url:
        return url, "lead-image-svg-fallback"
    return None, "no image"


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    manifest_path = os.path.join(OUTPUT_DIR, "manifest.json")
    manifest = {}
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path) as f:
                manifest = json.load(f)
        except Exception:
            manifest = {}

    failures = []
    for uid, title in UNIVERSITIES.items():
        filename = f"{uid}.jpg"
        filepath = os.path.join(OUTPUT_DIR, filename)
        if uid in manifest and os.path.exists(filepath):
            print(f"[SKIP] {uid}")
            continue
        try:
            url, note = find_campus_url(title)
            if not url:
                print(f"[MISS] {uid} ({title}): {note}")
                failures.append(uid)
                continue
            img = request_with_retry(url, stream=True)
            with open(filepath, "wb") as f:
                for chunk in img.iter_content(chunk_size=8192):
                    f.write(chunk)
            manifest[uid] = {"name": title, "file": filename, "sourceUrl": url, "source": note}
            print(f"[OK]   {uid} -> {filename}  [{note}]")
            time.sleep(1.2)
        except Exception as e:
            print(f"[ERROR] {uid} ({title}): {e}")
            failures.append(uid)

    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\nDone. {len(manifest)}/{len(UNIVERSITIES)} campus photos downloaded.")
    if failures:
        print(f"Needs manual check: {failures}")


if __name__ == "__main__":
    main()
