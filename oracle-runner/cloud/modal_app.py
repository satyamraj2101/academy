"""Cloud video builder on Modal.

One lesson -> (AI writes the script) -> (every scene renders on its own container, in parallel) -> (join) -> (publish to the Academy).
The renderer is the same Node code the Video Studio uses; Modal only decides where each scene runs. Scenes are cached by a content
hash, so a re-run only renders what changed.

    modal run cloud/modal_app.py --course <courseId> --lesson <lessonId>      # one lesson
    modal run cloud/modal_app.py --course <courseId>                         # every lesson of the course without a video
    modal run cloud/modal_app.py --course <courseId> --dry-run               # plan only: how many scenes, estimated credit

Secrets live in the Modal secret "academy-cloud" (Academy URL + service key + Access token + AI keys). Nothing here is printed.
"""
import hmac
import json
import os
import pathlib
import subprocess
import tempfile
import threading

import modal

RUNNER = pathlib.Path(__file__).resolve().parent.parent  # oracle-runner/

# Rough price of what one scene costs on this container size, for the dry-run estimate (USD per container-second).
# 2 cores at $0.0000131 per core-second + 4 GiB at $0.00000222 per GiB-second. Check modal.com/pricing; a dry run is only a guide.
USD_PER_CONTAINER_SECOND = 2 * 0.0000131 + 4 * 0.00000222
SECONDS_PER_VIDEO_SECOND = 2.0  # measured on a laptop at about 1.6 and expected a little slower on a cloud core; refined by the benchmark

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg", "fontconfig", "curl", "ca-certificates", "gnupg")
    .run_commands(
        "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -",
        "apt-get install -y nodejs",
    )
    .add_local_file(RUNNER / "package.json", "/app/package.json", copy=True)
    # The voice engine tries to fetch GPU files we do not use (and that 404); skip them.
    .run_commands("cd /app && npm install --omit=dev --onnxruntime-node-install-cuda=skip")
    # Download the ~90 MB voice model into the image once, so no container ever downloads it.
    .run_commands(
        "cd /app && node -e \"import('kokoro-js').then(async m => { await m.KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' }); console.log('voice model ready'); })\""
    )
    .pip_install("fastapi")  # only for the small web endpoint that wakes the worker; late in the image so the heavy layers stay cached
    .add_local_dir(RUNNER / "src", "/app/src", copy=True)
    .add_local_dir(RUNNER / "assets", "/app/assets", copy=True)
)

work = modal.Volume.from_name("academy-work", create_if_missing=True)  # scripts persist here, so a paused run resumes later
# Every finished scene is kept here under a hash of its content, so changing one scene of a video only draws that scene again.
scene_cache = modal.Volume.from_name("academy-scene-cache", create_if_missing=True)
app = modal.App("academy-video", image=image, secrets=[modal.Secret.from_name("academy-cloud")])


def _node(args, cwd="/app", check=True, stream=False, env=None):
    """Runs a Node step and returns its stdout. Only the tail of stderr is kept if it fails (it can hold URLs, never secrets).
    With stream=True the step's progress messages go straight to the container log (visible live in `modal app logs` and the
    Modal dashboard) instead of being held back until it finishes; the scripts only log lesson titles and timings."""
    if stream:
        p = subprocess.Popen(["node", *args], cwd=cwd, stdout=subprocess.PIPE, text=True, env=env)  # stderr is inherited
        out = p.communicate()[0]
        if check and p.returncode != 0:
            raise RuntimeError(f"node {' '.join(args[:2])} failed with exit code {p.returncode}")
        return out
    r = subprocess.run(["node", *args], cwd=cwd, capture_output=True, text=True, env=env)
    if check and r.returncode != 0:
        raise RuntimeError(f"node {' '.join(args[:2])} failed: {(r.stderr or r.stdout)[-1500:]}")
    return r.stdout


@app.function(cpu=2, memory=4096, timeout=900, max_containers=16, retries=modal.Retries(max_retries=2, initial_delay=2.0), volumes={"/cache": scene_cache})
def render_item(payload: dict) -> dict:
    """One scene or ship ride, rendered on its own container (or taken from the scene cache when it was drawn before).
    Returns the finished segment so the coordinator can join them."""
    try:
        scene_cache.reload()  # see scenes that other containers saved after this one started
    except Exception:
        pass  # a missed reload only means a cache miss
    with tempfile.TemporaryDirectory() as t:
        item_file = os.path.join(t, "item.json")
        with open(item_file, "w") as f:
            json.dump(payload, f)
        info = json.loads(_node(["src/cloud/scene.mjs", item_file, "/cache"]).strip().splitlines()[-1])
        d = os.path.join("/cache", info["key"])
        with open(os.path.join(d, "meta.json")) as m, open(os.path.join(d, "segment.mp4"), "rb") as s:
            out = {"key": info["key"], "meta": m.read(), "segment": s.read(), "stats": info.get("stats"), "cached": bool(info.get("cached"))}
        if not out["cached"]:
            try:
                scene_cache.commit()  # keep it for the next change to this video
            except Exception:
                pass
        return out


def _build_from_script(script_text: str, lesson_id: str, publish: bool, replace_video_id: str, script_info: dict) -> dict:
    """Everything after the AI step: fan the scenes out, join them, and publish. Runs inside a Modal function."""
    work = tempfile.mkdtemp()
    script, out, cache = (os.path.join(work, n) for n in ("script.json", "out", "cache"))
    with open(script, "w") as f:
        f.write(script_text)
    plan = json.loads(_node(["src/cloud/plan.mjs", script]).strip().splitlines()[-1])

    payloads = [{"item": it["item"], "opts": plan["opts"]} for it in plan["items"]]
    results = list(render_item.map(payloads, order_outputs=True))
    for r in results:  # put every returned scene where the normal assembler expects its cache
        d = os.path.join(cache, r["key"])
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "segment.mp4"), "wb") as f:
            f.write(r["segment"])
        with open(os.path.join(d, "meta.json"), "w") as f:
            f.write(r["meta"])

    o = plan["opts"]
    # Every scene is already in the cache, so this only joins them (and writes captions + chapters).
    _node(["src/video/make-video.mjs", script, out, "--cache", cache, "--voice", o["voice"], "--fx", o["fx"], "--fps", str(o["fps"])])
    with open(os.path.join(out, "chapters.json")) as f:
        chapters = json.load(f)
    summary = {
        "lesson": lesson_id, "title": script_info.get("title"), "scenes": script_info.get("scenes"), "script_warnings": script_info.get("warnings"), "ai": script_info.get("ai"),
        "video_seconds": chapters["duration"], "rendered_items": len(results), "drawn_again": sum(1 for r in results if not r.get("cached")),
        "container_seconds": round(sum((r["stats"] or {}).get("voiceSeconds", 0) + (r["stats"] or {}).get("frameSeconds", 0) + (r["stats"] or {}).get("encodeSeconds", 0) for r in results if not r.get("cached")), 1),
    }
    if publish:
        name = f"{lesson_id}-cloud"
        pub = json.loads(_node(["src/cloud/publish.mjs", out, lesson_id, name, *([replace_video_id] if replace_video_id else [])], env={**os.environ, "VIDEO_SCRIPT_FILE": script}).strip().splitlines()[-1])  # the script is kept with the video so the AI can edit it later
        summary["published"] = {"videoId": pub.get("videoId"), "sectionId": pub.get("sectionId")}
    return summary


@app.function(cpu=1, memory=4096, timeout=3600)
def build_lesson(course_id: str, lesson_id: str, intro: bool = False, publish: bool = True, replace_video_id: str = "") -> dict:
    """One lesson, start to finish: the AI step, then render, join and publish."""
    work = tempfile.mkdtemp()
    script = os.path.join(work, "script.json")
    s = json.loads(_node(["src/cloud/script.mjs", course_id, lesson_id, script, *(["--intro"] if intro else [])], stream=True).strip().splitlines()[-1])
    with open(script) as f:
        return _build_from_script(f.read(), lesson_id, publish, replace_video_id, s)


@app.function(cpu=1, memory=2048, timeout=4 * 3600, volumes={"/work": work})
def write_scripts(course_id: str, lesson_ids: list, intro_lesson: str = "") -> dict:
    """The AI step for several lessons, one after another in ONE process, so the AI gateway paces every call against the provider
    limits in a single place. A lesson that cannot be written because AI capacity ran out is reported with the time to retry."""
    out_dir = f"/work/scripts/{course_id}"
    os.makedirs(out_dir, exist_ok=True)
    args = ["src/cloud/scripts.mjs", course_id, out_dir, ",".join(lesson_ids), *(["--intro", intro_lesson] if intro_lesson else [])]
    try:
        summary = json.loads(_node(args, stream=True).strip().splitlines()[-1])
    finally:
        work.commit()  # keep every script written so far, even if the step failed part-way
    scripts = {}
    for r in summary["results"]:
        path = os.path.join(out_dir, f"{r['lessonId']}.json")
        if r.get("ok") and os.path.exists(path):
            with open(path) as f:
                scripts[r["lessonId"]] = f.read()
    return {"results": summary["results"], "scripts": scripts, "quota": summary.get("quota")}


@app.function(cpu=1, memory=4096, timeout=3600, max_containers=4)
def build_from_script(lesson_id: str, script_text: str, info: dict, publish: bool = True, replace_video_id: str = "") -> dict:
    """Render, join and publish a lesson whose script is already written (no AI call here)."""
    return _build_from_script(script_text, lesson_id, publish, replace_video_id, info)


@app.function(cpu=1, memory=2048, timeout=3600)
def run_jobs() -> str:
    """Runs the course-writing runner in the cloud until the job queue is empty (course from a prompt, document or transcript)."""
    r = subprocess.run(["node", "src/index.mjs", "--once"], cwd="/app", capture_output=True, text=True)
    tail = "" if r.returncode == 0 else "\n[stderr]\n" + r.stderr[-2000:]
    return (r.stdout or "")[-8000:] + tail


def _reason(e: Exception) -> str:
    """The last meaningful line of a failure, for an admin to read (the video-edit step prints its plain-language reason last)."""
    lines = [l.strip() for l in str(e).splitlines() if l.strip()]
    return (lines[-1] if lines else "The video could not be rebuilt.")[:400]


def _run_video_edit(job: dict) -> dict:
    """One 'change this video with AI' job: revise the script, render only what changed, replace the video, report to the admin."""
    jid, p = job["id"], job["payload"]
    state = {"step": "Starting"}
    stop = threading.Event()

    def step(text: str):
        state["step"] = text
        _node(["src/cloud/video-edit.mjs", "progress", jid, text], check=False)

    def beat():  # keeps the job's lease alive through the long steps
        while not stop.wait(60):
            _node(["src/cloud/video-edit.mjs", "progress", jid, state["step"]], check=False)

    threading.Thread(target=beat, daemon=True).start()
    d = tempfile.mkdtemp()
    job_file, script_file, result_file = (os.path.join(d, n) for n in ("job.json", "script.json", "result.json"))
    try:
        with open(job_file, "w") as f:
            json.dump(job, f)
        step("Writing the new script")
        info = json.loads(_node(["src/cloud/video-edit.mjs", "script", job_file, script_file]).strip().splitlines()[-1])
        step("Rendering the scenes")
        with open(script_file) as f:
            summary = _build_from_script(f.read(), p["lessonId"], True, p["videoId"], info)
        with open(result_file, "w") as f:
            json.dump({**summary, "lessonId": p["lessonId"], "oldVideoId": p["videoId"], "ai": info.get("ai"), "usedSavedScript": info.get("usedSavedScript")}, f)
        _node(["src/cloud/video-edit.mjs", "finish", jid, "done", result_file])
        return {"job": jid, "ok": True}
    except Exception as e:  # report to the admin instead of leaving the job running until its lease runs out
        _node(["src/cloud/video-edit.mjs", "finish", jid, "failed", _reason(e)], check=False)
        return {"job": jid, "ok": False, "error": _reason(e)}
    finally:
        stop.set()


@app.function(cpu=1, memory=2048, timeout=3600, max_containers=2)
def drain_video_jobs() -> str:
    """Works through the queued lesson-video edit jobs one after another, then stops (so nothing sits idle and costs credit)."""
    out = []
    while True:
        job = json.loads(_node(["src/cloud/video-edit.mjs", "claim"]).strip().splitlines()[-1])["job"]
        if not job:
            break
        out.append(_run_video_edit(job))
    return json.dumps(out)


@app.function(max_containers=2)
@modal.asgi_app()
def web():
    """POST /kick wakes the workers: the Academy calls it right after queueing a job, with a shared token. It starts the video
    and course workers in the background and returns at once; both exit by themselves when the queue is empty."""
    from fastapi import FastAPI, Header, HTTPException

    api = FastAPI()

    @api.post("/kick")
    def kick(authorization: str = Header(default="")):
        token = os.environ.get("MODAL_JOBS_TOKEN", "")
        if not token or not hmac.compare_digest(authorization.encode(), f"Bearer {token}".encode()):
            raise HTTPException(status_code=401, detail="unauthorized")
        drain_video_jobs.spawn()
        run_jobs.spawn()
        return {"started": True}

    return api


def _local_node(args):
    r = subprocess.run(["node", "--env-file=.env", *args], cwd=str(RUNNER), capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout)[-1500:])
    return r.stdout


@app.local_entrypoint()
def jobs():
    """modal run cloud/modal_app.py::jobs   -> works through the queued course jobs in the cloud, then stops."""
    print(run_jobs.remote())


@app.local_entrypoint()
def main(course: str, lesson: str = "", intro: bool = False, dry_run: bool = False, no_publish: bool = False, replace: bool = False, replace_video: str = ""):
    if lesson and replace_video and not dry_run:
        # Rebuild one lesson and swap it in for an existing video (keeps one video per lesson).
        print(json.dumps(build_lesson.remote(course, lesson, intro, not no_publish, replace_video)))
        return
    if lesson:
        lessons = [{"id": lesson, "title": lesson, "hasVideo": False}]
    else:
        lessons = [l for l in json.loads(_local_node(["src/cloud/lessons.mjs", course]).strip().splitlines()[-1]) if replace or not l["hasVideo"]]
    print(f"{len(lessons)} lesson(s) to build for course {course}")
    if dry_run:
        # A lesson video is roughly 2-4 minutes; the estimate is a guide, the real number comes from the first run.
        for l in lessons:
            print(" -", l["title"])
        low, high = 120, 240
        for label, secs in (("low", low), ("high", high)):
            est = len(lessons) * secs * SECONDS_PER_VIDEO_SECOND * USD_PER_CONTAINER_SECOND
            print(f"estimated credit ({label}, {secs}s of video per lesson): about ${est:.2f}")
        return
    # Stage 1: every script, written one after another through the AI gateway (so provider limits are respected in one place).
    ids = [l["id"] for l in lessons]
    stage1 = write_scripts.remote(course, ids, lesson if intro else "")
    info = {r["lessonId"]: r for r in stage1["results"]}
    for r in stage1["results"]:
        if not r.get("ok"):
            print("SCRIPT NOT WRITTEN", r["lessonId"], r.get("error"), "| retry after", r.get("retryAt"))
    ready = [i for i in ids if i in stage1["scripts"]]
    print(f"{len(ready)} of {len(ids)} scripts written; rendering them in parallel")
    # Stage 2: render, join and publish, in parallel (no AI call).
    results = list(build_from_script.map(ready, [stage1["scripts"][i] for i in ready], [info[i] for i in ready], [not no_publish] * len(ready), return_exceptions=True))
    for lid, r in zip(ready, results):
        print(("FAILED " + lid + " " + str(r)[:300]) if isinstance(r, Exception) else json.dumps(r))
