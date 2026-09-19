#!/usr/bin/env python3
import json
import os
import sys
import time
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
POST_FILE = ROOT / "current_post.json"
HISTORY_FILE = ROOT / "history.jsonl"
RESULT_FILE = ROOT / "last_result.json"
API_BASE = "https://graph.threads.com/v1.0"

def load_json(path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def already_published(post_id):
    if not HISTORY_FILE.exists():
        return False
    with HISTORY_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if row.get("id") == post_id:
                return True
    return False

def post_form(url, data):
    encoded = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(url, data=encoded, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Threads API HTTP {e.code}: {body}") from e

def main():
    token = os.environ.get("THREADS_ACCESS_TOKEN", "").strip()
    user_id = os.environ.get("THREADS_USER_ID", "").strip()
    if not token or not user_id:
        raise RuntimeError("Missing THREADS_ACCESS_TOKEN or THREADS_USER_ID GitHub Actions secret")

    post = load_json(POST_FILE)
    post_id = str(post.get("id", "")).strip()
    text = str(post.get("english", "")).strip()

    if not post_id:
        raise RuntimeError("current_post.json has no id")
    if not text:
        raise RuntimeError("current_post.json has no english text")
    if len(text.encode("utf-8")) > 500:
        raise RuntimeError(f"English post is too long: {len(text.encode('utf-8'))} UTF-8 bytes > 500")

    if already_published(post_id):
        print(f"Post {post_id} already published; skipping.")
        return 0

    create = post_form(
        f"{API_BASE}/{urllib.parse.quote(user_id)}/threads",
        {
            "media_type": "TEXT",
            "text": text,
            "access_token": token,
        },
    )
    creation_id = str(create.get("id", "")).strip()
    if not creation_id:
        raise RuntimeError(f"No creation id returned: {create}")

    # Meta recommends allowing the media container time to process before publish.
    time.sleep(30)

    published = post_form(
        f"{API_BASE}/{urllib.parse.quote(user_id)}/threads_publish",
        {
            "creation_id": creation_id,
            "access_token": token,
        },
    )
    media_id = str(published.get("id", "")).strip()
    if not media_id:
        raise RuntimeError(f"No Threads media id returned: {published}")

    now = datetime.now(timezone.utc).isoformat()
    history_row = {
        **post,
        "threads_media_id": media_id,
        "published_at": now,
    }
    with HISTORY_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(history_row, ensure_ascii=False) + "\n")

    result = {
        "ok": True,
        "id": post_id,
        "threads_media_id": media_id,
        "published_at": now,
        "english": text,
        "russian": post.get("russian", ""),
    }
    with RESULT_FILE.open("w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(json.dumps(result, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        error = {
            "ok": False,
            "error": str(exc),
            "failed_at": datetime.now(timezone.utc).isoformat(),
        }
        with RESULT_FILE.open("w", encoding="utf-8") as f:
            json.dump(error, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(json.dumps(error, ensure_ascii=False), file=sys.stderr)
        raise
