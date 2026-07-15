"""Download official university logos (as PNG) for the ScholarVista seed data.

How it works:
- For each university, fetches the Wikipedia article's infobox wikitext and
  extracts the actual logo/crest/seal file (the {{Infobox university}} image
  parameter) rather than the article's lead "page image" -- which is often a
  building photo, not the logo.
- Resolves that File: to a rendered PNG thumbnail via the MediaWiki imageinfo
  API, so SVG source files come back as usable PNGs.
- Falls back to the pageimages API only if no infobox logo is found.
- Downloads each PNG into ./logos/
- Writes ./logos/manifest.json mapping each university id -> local filename
  and the source URL, so you can paste it straight into seed.ts.

Usage:
    pip install requests
    python download_university_logos.py
"""

import json
import os
import re
import time
import requests

OUTPUT_DIR = "logos"
THUMB_SIZE = 500  # px, width of rendered PNG
REQUEST_DELAY = 1.5  # seconds between universities (be polite / avoid 429)
MAX_RETRIES = 5

# id matches the `id` field used in prisma/seed.ts
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

# Wikimedia's upload servers reject non-browser User-Agents with 403,
# so we present a standard browser UA.
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    )
}

API_URL = "https://en.wikipedia.org/w/api.php"

SESSION = requests.Session()
SESSION.headers.update(HEADERS)


def request_with_retry(url, params=None, stream=False):
    """GET with exponential backoff on HTTP 429 (rate limit)."""
    delay = 2.0
    for attempt in range(MAX_RETRIES):
        resp = SESSION.get(url, params=params, timeout=25, stream=stream)
        if resp.status_code == 429:
            wait = float(resp.headers.get("Retry-After", delay))
            print(f"       429 rate-limited, waiting {wait:.0f}s "
                  f"(attempt {attempt + 1}/{MAX_RETRIES})...")
            time.sleep(wait)
            delay *= 2
            continue
        resp.raise_for_status()
        return resp
    resp.raise_for_status()
    return resp

# Infobox parameters that typically hold the logo/crest, in priority order.
LOGO_PARAM_PRIORITY = ["logo", "image_name", "image", "crest", "seal", "coat"]

# File extensions we accept as a logo image.
IMAGE_EXT_RE = re.compile(r"\.(svg|png|jpg|jpeg|gif)$", re.IGNORECASE)


def get_wikitext(title: str):
    """Fetch the raw wikitext of an article's current revision."""
    params = {
        "action": "query",
        "titles": title,
        "prop": "revisions",
        "rvprop": "content",
        "rvslots": "main",
        "format": "json",
        "redirects": 1,
    }
    resp = request_with_retry(API_URL, params=params)
    pages = resp.json().get("query", {}).get("pages", {})
    page = next(iter(pages.values()), {})
    revs = page.get("revisions")
    if not revs:
        return None
    return revs[0]["slots"]["main"]["*"]


def extract_logo_filename(wikitext: str):
    """Find the best logo/crest File name from infobox parameters."""
    if not wikitext:
        return None

    # Collect "key = value" lines from the wikitext (infobox params).
    params = {}
    for m in re.finditer(r"\|\s*([\w_]+)\s*=\s*([^\n|]+)", wikitext):
        key = m.group(1).strip().lower()
        val = m.group(2).strip()
        if key not in params:
            params[key] = val

    def clean_filename(raw: str):
        # Handle "[[File:Name.svg|...]]" or bare "Name.svg"
        fm = re.search(r"(?:File|Image)\s*:\s*([^|\]]+)", raw, re.IGNORECASE)
        candidate = fm.group(1).strip() if fm else raw.strip()
        candidate = candidate.split("|")[0].strip().strip("[]").strip()
        return candidate if IMAGE_EXT_RE.search(candidate) else None

    for key in LOGO_PARAM_PRIORITY:
        if key in params:
            fn = clean_filename(params[key])
            if fn:
                return fn

    # Last resort: any parameter whose name contains "logo"/"crest"/"seal".
    for key, val in params.items():
        if any(tag in key for tag in ("logo", "crest", "seal")):
            fn = clean_filename(val)
            if fn:
                return fn
    return None


def resolve_file_thumb(filename: str, size: int = THUMB_SIZE):
    """Resolve a File: name to a rendered PNG thumbnail URL via imageinfo."""
    params = {
        "action": "query",
        "titles": f"File:{filename}",
        "prop": "imageinfo",
        "iiprop": "url",
        "iiurlwidth": size,
        "format": "json",
    }
    resp = request_with_retry(API_URL, params=params)
    pages = resp.json().get("query", {}).get("pages", {})
    page = next(iter(pages.values()), {})
    info = page.get("imageinfo")
    if not info:
        return None
    # thumburl is the rendered (PNG) version; fall back to original url.
    return info[0].get("thumburl") or info[0].get("url")


def get_pageimage_thumb(title: str, size: int = THUMB_SIZE):
    """Fallback: the article's lead page image, rendered as a thumbnail."""
    params = {
        "action": "query",
        "titles": title,
        "prop": "pageimages",
        "format": "json",
        "pithumbsize": size,
        "redirects": 1,
    }
    resp = request_with_retry(API_URL, params=params)
    pages = resp.json().get("query", {}).get("pages", {})
    page = next(iter(pages.values()), {})
    thumb = page.get("thumbnail")
    return thumb["source"] if thumb else None


def find_logo_url(title: str):
    """Return (url, source_note) for a university's logo, or (None, reason)."""
    try:
        wikitext = get_wikitext(title)
    except Exception as e:
        wikitext = None
    filename = extract_logo_filename(wikitext) if wikitext else None
    if filename:
        url = resolve_file_thumb(filename)
        if url:
            return url, f"infobox:{filename}"

    # Fallback to lead page image.
    url = get_pageimage_thumb(title)
    if url:
        return url, "pageimage-fallback"
    return None, "no image found"


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    manifest = {}
    failures = []

    # Load any existing manifest so re-runs are incremental.
    manifest_path = os.path.join(OUTPUT_DIR, "manifest.json")
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path) as f:
                manifest = json.load(f)
        except Exception:
            manifest = {}

    for uid, title in UNIVERSITIES.items():
        filename = f"{uid}.png"
        filepath = os.path.join(OUTPUT_DIR, filename)

        # Skip if we already have this logo (incremental re-run).
        if uid in manifest and os.path.exists(filepath):
            print(f"[SKIP] {uid} -> already downloaded")
            continue

        try:
            url, note = find_logo_url(title)
            if not url:
                print(f"[MISS] {uid} ({title}): {note}")
                failures.append(uid)
                continue

            img_resp = request_with_retry(url, stream=True)
            with open(filepath, "wb") as f:
                for chunk in img_resp.iter_content(chunk_size=8192):
                    f.write(chunk)

            manifest[uid] = {
                "name": title,
                "file": filename,
                "sourceUrl": url,
                "source": note,
            }
            flag = "" if note.startswith("infobox") else "  (fallback - verify)"
            print(f"[OK]   {uid} -> {filename}  [{note}]{flag}")
            time.sleep(REQUEST_DELAY)  # be polite to the API
        except Exception as e:
            print(f"[ERROR] {uid} ({title}): {e}")
            failures.append(uid)

    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"\nDone. {len(manifest)}/{len(UNIVERSITIES)} logos downloaded.")
    print(f"Manifest written to {manifest_path}")
    if failures:
        print(f"Failed / needs manual check: {failures}")


if __name__ == "__main__":
    main()
