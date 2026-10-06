"""Developer-only Commons importer. Never called by the app; no API key needed.

1. --discover writes candidates to /tmp/doodly-dinosaur-candidates.json.
2. Review and save {character_id: Commons file title} in dinosaur-image-selection.json.
3. --download fetches those exact files and records their attribution metadata.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
import html
import hashlib
from datetime import date
import json
from pathlib import Path
import re
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "DoodlyForestPrototype/0.1 (local educational prototype; Wikimedia Commons attribution retained)"
LICENSES = {"CC BY 4.0", "CC BY-SA 4.0", "CC BY 3.0", "CC BY-SA 3.0", "CC BY 2.5", "CC BY-SA 2.5", "CC BY 2.0", "CC BY-SA 2.0", "CC0", "Public domain"}
CANDIDATES = Path("/tmp/doodly-dinosaur-candidates.json")
last_request = 0.0


def fetch(url, limit=3_000_000):
    global last_request
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in {"commons.wikimedia.org", "upload.wikimedia.org", "thumb.wikimedia.org"}:
        raise ValueError("Unexpected image host")
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(4):
        time.sleep(max(0, 1.5 - (time.monotonic() - last_request)))
        last_request = time.monotonic()
        try:
            with urllib.request.urlopen(request, timeout=35) as response:
                data = response.read(limit + 1)
                if len(data) > limit:
                    raise ValueError("Image/metadata exceeds size limit")
                return data
        except urllib.error.HTTPError as error:
            if error.code not in {429, 503} or attempt == 3:
                raise
            try:
                delay = float(error.headers.get("Retry-After", "30"))
            except ValueError:
                delay = 60
            print(f"Commons rate limit: waiting {delay}s", flush=True)
            time.sleep(delay)


def query(params):
    url = API + "?" + urllib.parse.urlencode({"action": "query", "format": "json", "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "iiurlwidth": 500, **params})
    data = json.loads(fetch(url))
    if "error" in data:
        raise ValueError(data["error"])
    return list(data.get("query", {}).get("pages", {}).values())


def plain(value):
    return html.unescape(re.sub(r"<[^>]*>", "", value)).strip()


def info(page):
    image = page["imageinfo"][0]
    meta = image.get("extmetadata", {})
    value = lambda key: plain(meta.get(key, {}).get("value", ""))
    return {"title": page["title"], "url": image.get("thumburl", image["url"]).split("?")[0],
            "source": image["descriptionurl"], "author": value("Artist"),
            "license": value("LicenseShortName"), "licenseUrl": value("LicenseUrl"),
            "description": value("ImageDescription"), "credit": value("Credit"),
            "width": image.get("thumbwidth", image["width"]), "height": image.get("thumbheight", image["height"]),
            "mime": image.get("thumbmime", image["mime"])}


def discover(character):
    pages = query({"generator": "search", "gsrsearch": f'{character} restoration filetype:bitmap', "gsrnamespace": 6, "gsrlimit": 6})
    candidates = [info(page) for page in pages if "imageinfo" in page]
    print(f"{character}: {len(candidates)} candidates", flush=True)
    return character, candidates


def download(item):
    character, title = item
    cached = json.loads(CANDIDATES.read_text()).get(character, []) if CANDIDATES.exists() else []
    image = next((candidate for candidate in cached if candidate["title"] == title), None)
    if image is None:
        pages = query({"titles": title})
        if len(pages) != 1 or "imageinfo" not in pages[0]:
            raise ValueError(f"Missing file: {title}")
        image = info(pages[0])
    if image["license"] not in LICENSES or not image["author"]:
        raise ValueError(f"Review required: {title} / {image['license']}")
    extensions = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
    if image["mime"] not in extensions:
        raise ValueError(f"Unsupported image: {image['mime']}")
    ext = extensions[image["mime"]]
    path = ROOT / "public" / "dinosaurs" / f"{character}.{ext}"
    path.parent.mkdir(parents=True, exist_ok=True)
    data = fetch(image["url"])
    if not (data.startswith(b"\x89PNG\r\n\x1a\n") or data.startswith(b"\xff\xd8\xff") or (data.startswith(b"RIFF") and data[8:12] == b"WEBP")):
        raise ValueError(f"Not an image: {title}")
    path.write_bytes(data)
    image["src"] = f"/dinosaurs/{character}.{ext}"
    image["retrievedAt"] = date.today().isoformat()
    image["changes"] = "Wikimedia Commons가 제공하는 축소본. 추가 편집 없음."
    image["sha256"] = hashlib.sha256(data).hexdigest()
    print(f"{character}: {len(data)} bytes, {image['license']}", flush=True)
    return character, image


if __name__ == "__main__":
    import sys
    mode = sys.argv[1] if len(sys.argv) == 2 else ""
    if mode not in {"--discover", "--download"}:
        raise SystemExit("Use --discover or --download")
    if mode == "--discover":
        character_ids = re.findall(r'\{ id: "([^"]+)", world: "dinosaur"', (ROOT / "src/lib/story-options.ts").read_text())
        results = json.loads(CANDIDATES.read_text()) if CANDIDATES.exists() else {}
        with ThreadPoolExecutor(max_workers=1) as pool:
            futures = {pool.submit(discover, key): key for key in character_ids if key not in results}
            for future in as_completed(futures):
                key = futures[future]
                try:
                    _, results[key] = future.result()
                    CANDIDATES.write_text(json.dumps(results, ensure_ascii=False, indent=2))
                except Exception as error:
                    print(f"{key}: {error}", flush=True)
        if set(character_ids) - results.keys():
            raise SystemExit("Some candidates unavailable. Rerun discovery to resume.")
    else:
        selected = json.loads((ROOT / "scripts/dinosaur-image-selection.json").read_text())
        manifest = ROOT / "src/lib/dinosaur-images.json"
        results = json.loads(manifest.read_text()) if manifest.exists() else {}
        for key, title in selected.items():
            previous = results.get(key)
            if previous and previous["title"] == title:
                path = ROOT / "public" / previous["src"].lstrip("/")
                if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() == previous.get("sha256"):
                    continue
            _, results[key] = download((key, title))
            manifest.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n")
