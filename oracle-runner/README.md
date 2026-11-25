# Oracle job runner

Pulls AI authoring jobs from the Academy admin API and builds real draft courses with full lesson text.
It makes only outbound HTTPS calls, so the VM needs **no open inbound ports** and no tunnel.

| Job type | Input (`payload`) |
|---|---|
| `course_from_prompt` | `topic`, `audience`, `level`, `goal`, `numModules`, `duration`, `tone` |
| `course_from_document` | `source_url` (PDF/DOCX/PPTX/TXT/MD) or `text`, plus optional `topic`, `audience`, `numModules` |
| `course_from_transcript` | `text` or `source_url` (TXT/SRT/VTT), plus optional `topic`, `audience`, `numModules` |

Enqueue: `POST /api/admin/academy/ai-jobs { "type": "...", "payload": { ... } }`, poll `GET /api/admin/academy/ai-jobs?id=<id>`.
Jobs wait in D1 if the runner is down; a job whose runner dies is retried (3 attempts, 5-minute lease).

## Multiple AI providers
`src/ai.mjs` routes each step by role through `AI_DRAFT` / `AI_REVIEW` (see `.env.example`). Supported: `gemini`, `anthropic`, `openai` (and OpenAI-compatible hosts), `cloudflare` (Workers AI). A provider without a key is skipped; on 429/5xx it retries with backoff, then falls through to the next. When `AI_REVIEW` is set, every lesson gets a second-opinion pass by that model, which returns corrections that replace the draft (a failed review never fails the job). Unit tests: `npm test`.

## Lesson videos (Soomy and Indoo)
`src/video/` turns a scene script into an MP4 with no GPU and no paid service. **Soomy** is the SpotCLM instructor robot: full body, white and navy, the real SpotCLM logo on his chest panel, a tablet in one hand and a pointer in the other. His glass visor draws the real audio waveform, so there is no lip-sync to get wrong. **Indoo** is his mop-bot sidekick (she): curious and cheeky, with shaking legs, big glossy eyes, a wink, and a chirp for every mood. She wanders near Soomy in every scene. A slide beside them builds up as each point is spoken, and captions are burned in. Typography is Inter, as on spotclm.com. Names live in `NAMES` in `src/video/robot.mjs`.

**Special points (Indoo's eye-projector):** flag a bullet, step, compare item or takeaway with `"highlight": true` or `"highlight": "short key-point note"` and Indoo lights it for about 3.6 s: a soft cone of light from her eyes, a glow around the item, a `notice` chirp, and, when there is a note, a "KEY POINT" banner (shown on bullets and steps scenes). Unflagged items are never highlighted, so the beam always means "this one matters". Use it only for a genuine fact, warning or tip.

**Indoo's chirps** (`sfx` on a scene): `happy`, `curious`, `oops`, `celebrate`, `notice`, `nudge`. They are synthesised in code (pure tones, no noise, no licensing), mixed well under the voice, and Indoo's eyes and body react to each one. Attach a chirp to the *end* of a sentence (`{ "sound": "happy", "at": "before key dates" }`): it then waits for the pause that follows, so it never talks over Soomy; if there is no pause within 1.6 s the voice is dipped slightly under it. A quiz reveal gets a `happy` chirp automatically.
```bash
npm run video -- samples/what-is-clm.json out/clm --voice am_puck --fx clean --cache out/.cache
node src/video/voice-demo.mjs out/voices          # short clips to pick a voice by ear
```
- **Layouts:** `hook`, `bullets`, `steps` (highlights the current step with a description), `compare`, `quiz` (question, options, think countdown, answer reveal) and `recap`. Items name the words they should appear on (`"at"`).
- **Voice:** Kokoro (`am_puck`, `am_michael`, `am_fenrir`, `bm_george`...). `--fx clean` (default, pleasant, no added noise), `cute` (slightly higher), `robot` (buzz and echo, clearly synthetic) or `none`. Set `KOKORO_DTYPE=fp32` for the full-quality (slower, larger) model.
- **Scene cache:** each scene renders to its own MP4, keyed by a hash of its content, voice and effect. Edit one scene and only that scene re-renders (about 30 s instead of about 160 s for a 100 s video).
- **Quiz pause:** `||` in the spoken text plus `thinkSeconds`. `chapters.json` lists chapters and each quiz's `pauseAt` / `revealAt` for the player.

## Video Studio (review, mark edits, re-render)
```bash
node --env-file=.env src/studio/server.mjs        # http://127.0.0.1:4300
```
Open a lesson, watch it, and pause where something should change. Write a note (it is pinned to that moment and scene), then **Propose changes**: the AI revises only the affected scenes and shows a before/after you accept or discard. Accepting creates a new version and re-renders only the changed scenes. Versions are kept, and quiz checkpoints pause the video and ask the student.
- Needs an AI key in `.env` (`AI_DRAFT`, see above) for proposals. Data lives in `studio-data/` (git-ignored).
- Binds to `127.0.0.1`. To use it from the Oracle VM set `STUDIO_HOST`, put it behind Cloudflare Access, and set `STUDIO_TOKEN` (open `/?token=...`).
- Rendering runs in a separate process so the page stays responsive.

## 1. Create the Oracle VM (one time, in the Oracle Cloud console)
1. Compute > Instances > Create instance. Image: **Ubuntu 24.04** (aarch64). Shape: **VM.Standard.A1.Flex**, 2 OCPU, **12 GB** RAM. That is now the whole Always Free Ampere allowance (Oracle reduced it from 4 OCPU / 24 GB), so use all of it on one VM; creating more than the allowance can get instances disabled.
2. Networking: keep the default public subnet and a public IP. Add your SSH public key (or download the generated key).
3. If creation says "Out of capacity", retry another availability domain or try later; A1 capacity is shared.
4. Keep the instance busy or monitored: Oracle can reclaim Always Free instances idle for 7 days.

## 2. Install Docker on the VM
```bash
ssh ubuntu@<vm-public-ip>
sudo apt-get update && sudo apt-get install -y docker.io
sudo usermod -aG docker ubuntu && newgrp docker
```

## 3. Deploy the runner
```bash
# from your PC, in the repo root
scp -r oracle-runner ubuntu@<vm-public-ip>:~/oracle-runner
ssh ubuntu@<vm-public-ip>
cd oracle-runner && cp .env.example .env && nano .env      # fill in the keys
docker build -t spotclm-runner .
docker run -d --name spotclm-runner --restart unless-stopped --env-file .env spotclm-runner
docker logs -f spotclm-runner
```

Update later: re-`scp`, then `docker build` and `docker rm -f spotclm-runner` and `docker run` again.

## Secrets
`.env` stays on the VM and is never committed. Use a Gemini key created for the runner, not the one in `.dev.vars`.

## Known limits
- Scanned or image-only PDFs have no text and fail with a clear error (OCR is not built).
- The admin API has no course delete, so a retried job may leave an unused draft; its id is reported as `abandoned_draft_course_id` in the job result.
- Source text is capped at 400k characters.
- Local test: see `functions/api/admin/academy/ai-jobs*` and run the runner against `wrangler pages dev` with `GEMINI_BASE_URL` pointed at a mock.
