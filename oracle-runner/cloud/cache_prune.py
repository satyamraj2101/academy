"""Housekeeping for the scene cache volume.

Every scene the cloud renders is kept under a hash of its content, so changing one scene of a video only draws that scene again. Scenes
that are no longer part of any video (an edited-away sentence, an old render version) would pile up forever, so this removes the oldest
ones: first anything older than max_age_days, then, if the cache is still larger than max_bytes, the oldest of what is left.
A removed scene costs a few cents to draw again, so being generous with age is cheap insurance, and being wrong is harmless.
"""
import os
import shutil
import time


def _size(path: str) -> int:
    total = 0
    for base, _dirs, files in os.walk(path):
        for f in files:
            try:
                total += os.path.getsize(os.path.join(base, f))
            except OSError:
                pass
    return total


def prune(root: str, max_age_days: float = 45, max_bytes: int = 4 * 1024**3, now: float | None = None, dry_run: bool = False) -> dict:
    """Returns {"kept": n, "removed": n, "freed_bytes": n, "left_bytes": n}. Only direct sub-folders of root are scenes."""
    now = time.time() if now is None else now
    scenes = []
    if os.path.isdir(root):
        for name in os.listdir(root):
            path = os.path.join(root, name)
            if not os.path.isdir(path):
                continue
            try:
                newest = max([os.path.getmtime(path)] + [os.path.getmtime(os.path.join(path, f)) for f in os.listdir(path)])
            except OSError:
                continue
            scenes.append({"path": path, "mtime": newest, "bytes": _size(path)})
    scenes.sort(key=lambda s: s["mtime"])  # oldest first

    cutoff = now - max_age_days * 86400
    remove = [s for s in scenes if s["mtime"] < cutoff]
    keep = [s for s in scenes if s["mtime"] >= cutoff]
    left = sum(s["bytes"] for s in keep)
    while keep and left > max_bytes:  # still too big: drop the oldest of what remains
        s = keep.pop(0)
        remove.append(s)
        left -= s["bytes"]

    if not dry_run:
        for s in remove:
            shutil.rmtree(s["path"], ignore_errors=True)
    return {"kept": len(keep), "removed": len(remove), "freed_bytes": sum(s["bytes"] for s in remove), "left_bytes": left}
