# SpotCLM Academy — Test Plan (Phases 0–7)

Covers everything built across this roadmap. Phases 0–3 were deployed and spot-checked earlier in this effort against the live site (`spotclm-academy.pages.dev`, D1 database `spotclm-admin`). **Phases 4–7 have been built and typechecked/build-verified but never deployed** — migrations 0025, 0026, 0027 have not been applied to production and no build since Phase 3 has shipped.

## 0. Pre-flight (do this first)

- [ ] Apply pending migrations to `spotclm-admin` in order: `0025_gamification.sql`, `0026_learning_paths.sql`, `0027_service_api_keys.sql` (0023/0024 already applied).
  ```
  npx wrangler d1 execute spotclm-admin --remote --file migrations/0025_gamification.sql
  npx wrangler d1 execute spotclm-admin --remote --file migrations/0026_learning_paths.sql
  npx wrangler d1 execute spotclm-admin --remote --file migrations/0027_service_api_keys.sql
  ```
- [ ] `npm run build && npx wrangler pages deploy dist --project-name spotclm-academy --branch main`
- [ ] Confirm `GEMINI_API_KEY` secret is set (required for Phase 1 wizard, Phase 5 AI tutor) — `npx wrangler pages secret list`.
- [ ] Have one admin/superadmin login and at least two student logins ready (one to act as course author's test student, one to act as a "peer" for peer-review testing).

---

## Phase 0 — Course builder / player fixes
*(already deployed once; re-verify after this deploy in case of regressions)*

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 0.1 | Grading tab persists | Course Builder → Grading tab → set passing score, assessment type, quiz/assignment weights → reload page | Values survive reload; weights stay linked to 100% total |
| 0.2 | Free-preview lesson | Mark a lesson `is_preview` (Curriculum → lesson gear icon) → log out → open course detail → click "Preview" badge | Non-enrolled/logged-out visitor can open the lesson in the player (redirected to login first if logged out) |
| 0.3 | Embedded quiz/assignment gates completion | Add a Quiz block and an Assignment block to a lesson → view as an enrolled student | "Mark Complete" stays disabled until the quiz is passed and the assignment is submitted |
| 0.4 | Drip scheduling | Set a lesson's drip to `3` days after enrollment → enroll a fresh test student → try to open that lesson immediately | 403 "not yet available"; after editing `enrolled_at` back 4+ days (or waiting), lesson opens |
| 0.5 | Preview/publish toggles | Toggle a lesson's `is_published` off → view course as a student | Lesson disappears from curriculum/player |

## Phase 1 — Course builder completeness

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 1.1 | Course metadata | Settings tab → set Subtitle, Keywords, Language(s), Price (INR) → save → reload | All four persist |
| 1.2 | Course duplication | Course Manager → click duplicate icon on a course with modules/quizzes/assignments | New "(Copy)" draft course appears with identical curriculum; quiz/assignment IDs are new, not shared with the original |
| 1.3 | Cross-module lesson drag | Curriculum tab → drag a lesson from Module A onto a lesson in Module B | Lesson moves to Module B; sort orders in both modules stay clean (no gaps/dupes) |
| 1.4 | AI Studio → Create Assignment | AI Studio tab → Assignment mode → generate → pick target module/lesson → Create Assignment → open that lesson's Curriculum editor → add an Assignment block | Block auto-populates with the pre-created assignment (this was a real bug fixed this session — confirm it actually links, not just creates an orphaned assignment) |
| 1.5 | File upload block | Curriculum → edit a lesson → add Image/Video/PPT block → click Upload (not Browse) → pick a local file | File uploads to R2, block content updates to the resulting URL, preview renders |
| 1.6 | AI Course Wizard full pipeline | Courses → Generate with AI → fill brief → generate outline → review → set price/banner → Create This Course | Real course created with real quizzes (questions gradable) and assignments per module, not markdown stubs |

## Phase 2 — Richer quiz engine

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 2.1 | Author all 4 question types | Quiz block editor → add one MCQ, one True/False, one Multi-select (2+ correct), one Short-answer | All save; Short-answer requires no correct-answer input |
| 2.2 | Student takes mixed quiz | As a student, take the quiz above | Each type renders correctly (radio/radio/checkboxes/textarea) |
| 2.3 | Auto-grading correctness | Submit: correct MCQ, correct True/False, exactly-correct Multi-select set, any Short-answer text | Score reflects only the 3 auto-graded questions; passed/failed correct relative to passing score |
| 2.4 | Short-answer routes to grading | After submitting, check Grading Desk | The short-answer response appears in the queue, tagged "Quiz Short-Answer" |
| 2.5 | Grading a short-answer recomputes score | In Grading Desk, award points to the short-answer submission | Student's quiz attempt score/passed updates to include the awarded points |
| 2.6 | Post-submission review | After submitting, check the review screen | Each question shows correct/incorrect (or "pending grading" for short-answer), the correct answer, and explanation |

## Phase 3 — Threaded discussions

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 3.1 | Post + reply | Student A posts a question on a lesson → Student B replies | Reply renders nested under the question, not as a new top-level post |
| 3.2 | Reply notification | After 3.1 | Student A gets a notification "New reply to your question" |
| 3.3 | Upvote | Any student clicks the upvote arrow on a post | Count increments; clicking again removes the vote (toggle) |
| 3.4 | Best answer (instructor-only) | Log in as instructor/admin → open the thread → mark a reply as best answer | Reply gets a "Best Answer" badge; marking a different reply un-marks the first (one per thread) |
| 3.5 | Best answer hidden from students | Log in as a regular student, view the same thread | No "Mark Best Answer" button visible |

## Phase 4 — Gamification *(not yet deployed)*

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 4.1 | Lesson-complete points + badge | As a fresh student, complete your first lesson ever | +10 points; "First Lesson Complete" badge awarded (check Dashboard) |
| 4.2 | Course-complete points + badge | Complete every lesson in a course | +50 points; "Course Completion" badge awarded once, not per-lesson |
| 4.3 | Quiz-pass points + perfect badge | Pass a quiz with <100% then with 100% | First pass: +25 points, no perfect badge. 100% pass: +25 points AND "Perfect Quiz Score" badge |
| 4.4 | Certificate badge | Complete a course with `has_certification=1` | "First Certificate Earned" badge appears alongside the issued certificate |
| 4.5 | Streak increments daily | Complete a lesson today, then again tomorrow (or manipulate `academy_streaks.last_active_date` for testing) | `current_streak` becomes 2; a gap of 2+ days resets it to 1 |
| 4.6 | 7-day streak badge | Get `current_streak` to 7 | "7-Day Streak" badge auto-awards |
| 4.7 | Leaderboard | Visit `/leaderboard` as a student with points | Correct rank, correct point total, your row highlighted |
| 4.8 | No double-counting | Reload a lesson you already completed and hit "Mark Complete" again (if possible) or refresh an already-100% course | Points/badges do NOT re-award |

## Phase 5 — AI Tutor *(not yet deployed)*

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 5.1 | Grounded answer | Open AI Tutor panel on a lesson with distinctive content → ask a question only answerable from that lesson | Response is grounded in the actual lesson content, not generic |
| 5.2 | Enrollment/preview gate | Try hitting the AI ask on a lesson you're not enrolled in (non-preview) | 403, not a generic Gemini response |
| 5.3 | Quiz Me mode | Switch to "Quiz Me" tab | 3 practice questions generate, grounded in the lesson; answering shows immediate correct/incorrect + explanation |
| 5.4 | Quiz Me doesn't pollute stats | After using Quiz Me repeatedly | No new rows in `academy_quiz_attempts`; Dashboard points/gamification unaffected |
| 5.5 | Rate limit | Send 21+ AI requests (ask or quiz-me) from one account within 10 minutes | 21st request gets a 429 "usage limit" message, not a Gemini call |
| 5.6 | No unauthenticated access | `curl -X POST .../api/academy/ai/ask` with no auth cookie/token | 401, not a Gemini response (this was a real open vulnerability before this phase) |

## Phase 6 — Prerequisites, catalog lock, peer review *(not yet deployed)*

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 6.1 | Add a prerequisite | Course Builder → Settings → Prerequisites → link Course B to require Course A, enforcement = hard | Saves; shows in the list with a "hard" tag |
| 6.2 | Catalog lock badge | Visit `/courses` (logged out or in) | Course B shows a "🔒 Requires: Course A" badge |
| 6.3 | Hard block enforced | As a student who hasn't completed Course A, try to enroll in Course B (both UI button and direct POST to `/api/academy/enrollments`) | UI: button disabled with inline message. API: 403 either way — **this must hold even if someone bypasses the UI** |
| 6.4 | Soft prerequisite | Set enforcement = soft on a different link → try enrolling | A confirm() dialog warns but allows proceeding; enrollment succeeds either way |
| 6.5 | Prerequisite met | Complete Course A (100% progress) → try enrolling in Course B again | No block, no warning |
| 6.6 | Auto peer-review assignment | Student submits an assignment for the first time (course must have 2+ other enrolled students) | 2 random other enrolled students get a pending row in `academy_peer_reviews` |
| 6.7 | Student reviews a peer | Log in as an assigned reviewer → visit `/peer-reviews` → submit feedback (+optional score) | Review moves from "To Review" to "Reviewed"; submitter can't review their own submission (verify by checking assignment logic excludes self) |
| 6.8 | Instructor manual assign | `POST /api/admin/academy/peer-reviews` with a specific `submission_id`/`reviewer_user_id` | New pending review created, `assigned_by` = admin email, shows correctly alongside auto-assigned ones |
| 6.9 | Re-submission doesn't re-assign | Student edits and resubmits an already-submitted assignment | No duplicate/new peer-review rows created (only first-time submission auto-assigns) |

## Phase 7 — MCP Server *(not yet deployed; server itself already verified locally)*

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 7.1 | Create service key | Admin panel → Service Keys (superadmin login required) → Create Key | Plaintext `sk_...` shown once; refreshing the page never shows it again |
| 7.2 | Non-superadmin blocked | Log in as a regular admin (not superadmin) → try the Service Keys page/API | 403 |
| 7.3 | MCP auth works | Set `ACADEMY_SERVICE_API_KEY` env var to the key from 7.1, run `node mcp-server/dist/index.js`, call `list_courses` via an MCP client | Returns real course data, not 401 |
| 7.4 | Revoked key rejected | Revoke the key from the admin page → retry `list_courses` | 401 "invalid or revoked service API key" |
| 7.5 | generate_course_from_prompt | Call this tool with a topic/audience/goal | A real draft course appears in the admin Course Builder with modules, lessons, a quiz (real gradable questions) and an assignment per module — indistinguishable from one built via the AI Wizard in the web UI |
| 7.6 | publish_course doesn't blank fields | Call `create_course`, then separately `publish_course` on it, then check the course in admin | Title/description/etc. are still intact after publish (this was a real full-replace-PUT bug caught and fixed during this phase) |
| 7.7 | set_lesson_drip doesn't blank fields | Create a lesson with content via `create_lesson`, then call `set_lesson_drip` with only `drip_days` | Lesson's title/content/is_preview/is_published are unchanged after the call |

---

## Regression sweep (run after all of the above)

- [ ] Public catalog and course detail pages still load with no console errors (all price/prerequisite/lock rendering).
- [ ] A completely fresh student can sign up → enroll in a free course with no prerequisites → complete a lesson → pass a quiz → get a certificate, end to end, with no errors.
- [ ] Admin Course Builder loads and saves for an existing pre-Phase-6 course (one with no prerequisites/peer-reviews/gamification data) without crashing on the new fields.
