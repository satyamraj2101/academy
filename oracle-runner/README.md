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

## Lesson videos (faceless robot narrator)
`src/video/` turns a scene script into an MP4 with no GPU and no paid service: Kokoro voice, a drawn robot whose chest sound bars follow the audio (so no lip-sync is needed), a slide beside it that reveals bullets and diagram steps as they are spoken, and captions burned in (plus `.srt` and `.vtt` files).
```bash
npm run video -- samples/contract-lifecycle.json out/contract   # writes out/contract/video.mp4 and timings.json
```
Script format: `{ "scenes": [ { "narration": "...", "slide": { "title": "...", "bullets": [], "steps": [] } } ] }`.
`timings.json` reports render speed; measure it on the Oracle VM before planning a large batch. On a 16-thread desktop the voice is the slow step (about real time), the rest is quick.

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
