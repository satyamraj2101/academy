# Graph Report - academy-main  (2026-11-26)

## Corpus Check
- 361 files · ~241,385 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 21 file(s) not represented in the graph (top: (none) 7, .ttf 4, .stackdump 3)

## Summary
- 2043 nodes · 5576 edges · 122 communities (91 shown, 31 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bcede863`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CoursePlayer.tsx
- prune
- react
- verifyAcademyUser
- App.tsx
- corsOptionsResponse
- src/index.ts
- NotFound.tsx
- getCorsHeaders
- dependencies
- errorResponse
- register.ts
- package.json
- assets.ts
- verifyAdminRequest
- errorResponse
- 0003_academy_schema.sql
- 0001_initial_schema.sql
- logAdminAction
- corsOptionsResponse
- verifyAdminRequest
- progress.ts
- server.ts
- AdminLayout.tsx
- InstructorCourseBuilder.tsx
- prerender.mjs
- compilerOptions
- Env
- import-zip.ts
- compilerOptions
- academy_users
- academy_lessons
- adminFetch
- vitest
- _node
- 0026_learning_paths.sql
- scripts
- modal_app.py
- service-keys.ts
- verifyAccessJwt.ts
- assess.ts
- i18n.ts
- LessonPath.tsx
- academy_audit_log
- academy_discussions
- main.tsx
- InteractiveVideoPlayer.tsx
- gemini-generate.ts
- render.mjs
- lesson-ai-edit.ts
- academy_orders
- VideoAiEditPanel.tsx
- ai.mjs
- download/[credentialId].ts
- enquiry.ts
- subscribe.ts
- track.ts
- 0007_lms_expanded.sql
- 0019_course_builder_modules.sql
- academy-data.ts
- video-progress.ts
- server.mjs
- academy/lessons/[id]/sections.ts
- [[path]].ts
- tawkto.ts
- academy_quiz_sessions
- academy_notifications
- academy_refresh_tokens
- academy_quiz_short_answer_submissions
- ai-quota.ts
- scene.test.mjs
- ApiError
- 0027_service_api_keys.sql
- lesson-to-script.mjs
- video/scene.mjs
- 0002_subscribers.sql
- 0028_instructor_and_referral_v2.sql
- function
- setup-2fa.ts
- react
- lesson-videos.ts
- oracle-runner/package.json
- ai-jobs.ts
- tts.mjs
- robot.mjs
- jobs.mjs
- api.mjs
- @sentry/react
- sfx.mjs
- parse_services.mjs
- scripts.mjs
- edits.mjs
- MermaidDiagram.tsx
- enrollments/index.ts
- course-prerequisites.ts
- useTheme.ts
- make-video.mjs
- AIAssistantPanel.tsx
- redemptions.ts
- 0030_ai_jobs.sql
- 0031_video_progress.sql
- 0032_ai_usage.sql
- TawkWidget.tsx
- WatchTracker
- modal_smoke.py
- useTracking.ts
- sonner
- AIAssistantWidget.tsx
- 0033_ai_quota.sql

## God Nodes (most connected - your core abstractions)
1. `verifyAdminRequest()` - 155 edges
2. `corsResponse()` - 150 edges
3. `errorResponse()` - 142 edges
4. `errorResponse()` - 130 edges
5. `verifyAcademyUser()` - 121 edges
6. `hasPermission()` - 116 edges
7. `corsOptionsResponse()` - 115 edges
8. `corsOptionsResponse()` - 103 edges
9. `corsResponse()` - 102 edges
10. `logAdminAction()` - 99 edges

## Surprising Connections (you probably didn't know these)
- `QuizAiPanel()` --indirect_call--> `toQuizQ()`  [INFERRED]
  src/admin/components/builder/QuizAiPanel.tsx → functions/api/admin/academy/_quizEdit.ts
- `UndoState` --references--> `QuizQ`  [EXTRACTED]
  src/admin/components/builder/QuizAiPanel.tsx → functions/api/admin/academy/_quizEdit.ts
- `QuizAiPanel()` --calls--> `planQuizChanges()`  [EXTRACTED]
  src/admin/components/builder/QuizAiPanel.tsx → functions/api/admin/academy/_quizEdit.ts
- `build()` --calls--> `buildVideoContent()`  [EXTRACTED]
  src/test/interactiveVideo.test.ts → functions/api/academy/_interactiveVideo.ts
- `Proposal` --references--> `QuizChange`  [EXTRACTED]
  src/admin/components/builder/QuizAiPanel.tsx → functions/api/admin/academy/_quizEdit.ts

## Import Cycles
- None detected.

## Communities (122 total, 31 thin omitted)

### Community 0 - "CoursePlayer.tsx"
Cohesion: 0.26
Nodes (18): dompurify, MermaidDiagram(), useIsDark(), parseContent(), AIAssistantPanel(), CoursePlayerComponent(), RailButton(), AssignmentSection() (+10 more)

### Community 1 - "prune"
Cohesion: 0.21
Nodes (4): prune(), _size(), PruneTest, scene()

### Community 2 - "react"
Cohesion: 0.07
Nodes (59): react-helmet-async, react-router-dom, @tanstack/react-query, academyAPI, API_BASE, APIError, fetchAPI(), AcademyContext (+51 more)

### Community 3 - "verifyAcademyUser"
Cohesion: 0.07
Nodes (28): onRequestGet(), onRequestOptions(), onRequestPost(), corsResponse(), onRequestGet(), onRequestOptions(), onRequestGet(), onRequestOptions() (+20 more)

### Community 4 - "App.tsx"
Cohesion: 0.09
Nodes (36): react-dom, AcademyProvider(), AcademyHomeComponent, AdminAppComponent, App(), AppLayout(), BARE_LAYOUT_ROUTES, CertificationsComponent (+28 more)

### Community 5 - "corsOptionsResponse"
Cohesion: 0.05
Nodes (49): Env, onRequestOptions(), onRequestPatch(), onRequestOptions(), Env, onRequestGet(), onRequestOptions(), Env (+41 more)

### Community 6 - "src/index.ts"
Cohesion: 0.06
Nodes (45): bin, spotclm-academy-mcp, dependencies, @modelcontextprotocol/sdk@^1.12.0, zod@^3.23.8, description, devDependencies, @types/node@^20.14.0 (+37 more)

### Community 7 - "NotFound.tsx"
Cohesion: 0.08
Nodes (41): motion, AssessmentTool(), AssessmentToolProps, Button(), ButtonProps, Size, sizes, Variant (+33 more)

### Community 8 - "getCorsHeaders"
Cohesion: 0.38
Nodes (5): getCorsHeaders(), onRequestGet(), onRequestOptions(), onRequestGet(), onRequestOptions()

### Community 9 - "dependencies"
Cohesion: 0.05
Nodes (44): dependencies, bcryptjs@^3.0.3, canvas-confetti@^1.9.4, dompurify@^3.4.11, @headlessui/react@^2.2.10, @hookform/resolvers@^5.4.0, jose@^6.2.3, jszip@^3.10.1 (+36 more)

### Community 10 - "errorResponse"
Cohesion: 0.12
Nodes (45): onRequestDelete(), onRequestPut(), onRequestGet(), onRequestGet(), errorResponse(), requireRole(), verifyAcademyUser(), onRequestPost() (+37 more)

### Community 11 - "register.ts"
Cohesion: 0.15
Nodes (19): onRequestOptions(), onRequestPost(), handleFailedLogin(), onRequestOptions(), onRequestPost(), onRequestOptions(), onRequestPatch(), hashIp() (+11 more)

### Community 12 - "package.json"
Cohesion: 0.07
Nodes (37): devDependencies, autoprefixer@^10.4.21, @cloudflare/workers-types@^4.20260629.1, esbuild@^0.25.0, jsdom@^29.1.1, @playwright/test@^1.61.1, tailwindcss@^4.1.14, tsx@^4.21.0 (+29 more)

### Community 13 - "assets.ts"
Cohesion: 0.33
Nodes (5): Env, onRequestDelete(), onRequestGet(), onRequestOptions(), onRequestPost()

### Community 14 - "verifyAdminRequest"
Cohesion: 0.11
Nodes (23): Env, onRequestDelete(), onRequestGet(), onRequestOptions(), onRequestPost(), Env, onRequestDelete(), onRequestGet() (+15 more)

### Community 15 - "errorResponse"
Cohesion: 0.08
Nodes (45): Env, onRequestDelete(), onRequestGet(), onRequestPost(), onRequestPut(), Env, onRequestGet(), onRequestOptions() (+37 more)

### Community 16 - "0003_academy_schema.sql"
Cohesion: 0.14
Nodes (24): academy_courses, academy_credit_redemptions, academy_enrollments, academy_modules, academy_payments, academy_quiz_attempts, academy_quiz_questions, academy_quizzes (+16 more)

### Community 17 - "0001_initial_schema.sql"
Cohesion: 0.12
Nodes (22): activity_events, admin_audit_log, admin_users, assessment_submissions, chat_messages, chat_sessions, email_audit, email_templates (+14 more)

### Community 18 - "logAdminAction"
Cohesion: 0.10
Nodes (22): Env, onRequestOptions(), onRequestPost(), Env, onRequestOptions(), onRequestPost(), Env, onRequestDelete() (+14 more)

### Community 19 - "corsOptionsResponse"
Cohesion: 0.06
Nodes (42): onRequestOptions(), onRequestOptions(), GeneratedQuestion, onRequestOptions(), onRequestPost(), onRequestOptions(), onRequestPost(), onRequestOptions() (+34 more)

### Community 20 - "verifyAdminRequest"
Cohesion: 0.10
Nodes (24): Env, onRequestGet(), onRequestOptions(), onRequestPost(), recomputeQuizAttemptScore(), Env, onRequestGet(), onRequestOptions() (+16 more)

### Community 21 - "progress.ts"
Cohesion: 0.19
Nodes (19): awardBadge(), awardPoints(), BADGE_SLUGS, onCertificateIssued(), onCourseCompleted(), onLessonCompleted(), onQuizPassed(), POINTS (+11 more)

### Community 22 - "server.ts"
Cohesion: 0.13
Nodes (12): compression@^1.8.1, dotenv@^17.2.3, express@^5.2.1, helmet@^8.2.0, vite@^6.2.3, vite@^6.2.3, compression, dotenv (+4 more)

### Community 23 - "AdminLayout.tsx"
Cohesion: 0.13
Nodes (18): academyNavItems, AdminLayout(), bottomNavItems, navItems, PermissionGate(), RoleGate(), AdminAuthContext, AdminAuthProvider() (+10 more)

### Community 24 - "InstructorCourseBuilder.tsx"
Cohesion: 0.15
Nodes (14): instructorAPI, Block, BlockType, Course, InstructorAssignmentBlock(), InstructorCourseBuilderComponent(), InstructorLessonEditor(), InstructorQuizBlock() (+6 more)

### Community 25 - "prerender.mjs"
Cohesion: 0.19
Nodes (11): @tailwindcss/vite@^4.1.14, @tailwindcss/vite, baseHtml, buildHtml(), distDir, indexPath, pages, replaceCanonical() (+3 more)

### Community 26 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+8 more)

### Community 27 - "Env"
Cohesion: 0.27
Nodes (9): Env, onRequestOptions(), onRequestPost(), onRequestOptions(), onRequestPost(), awardReferralCommission(), clawbackReferralCredits(), onRequestPost() (+1 more)

### Community 28 - "import-zip.ts"
Cohesion: 0.22
Nodes (10): CONTENT_TYPES, Env, extOf(), IMAGE_EXT, onRequestOptions(), onRequestPost(), parsePrefixed(), PendingSection (+2 more)

### Community 29 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, declaration, esModuleInterop, module, moduleResolution, outDir, resolveJsonModule, rootDir (+4 more)

### Community 30 - "academy_users"
Cohesion: 0.21
Nodes (11): academy_users, idx_academy_users_email, idx_academy_users_referral_code, idx_academy_users_referred_by, idx_academy_users_role, academy_course_reviews, idx_reviews_course, academy_badges (+3 more)

### Community 31 - "academy_lessons"
Cohesion: 0.26
Nodes (11): academy_lesson_progress, academy_lessons, idx_lessons_module, academy_lesson_knowledge_check_responses, academy_lesson_knowledge_checks, academy_lesson_notes, academy_user_preferences, idx_check_responses_user (+3 more)

### Community 32 - "adminFetch"
Cohesion: 0.04
Nodes (88): AiStudioTab(), GeneratedQuestion, LessonOption, Mode, Module, AiTextChange(), Props, Asset (+80 more)

### Community 33 - "vitest"
Cohesion: 0.20
Nodes (8): @vitejs/plugin-react@^5.0.4, @testing-library/jest-dom@^6.9.1, @testing-library/react@^16.3.2, vitest@^4.1.9, @testing-library/jest-dom, @testing-library/react, @vitejs/plugin-react, vitest

### Community 34 - "_node"
Cohesion: 0.18
Nodes (9): fetch_wiki_logo(), _build_from_script(), build_lesson(), drain_video_jobs(), _node(), render_item(), _run_video_edit(), beat() (+1 more)

### Community 35 - "0026_learning_paths.sql"
Cohesion: 0.36
Nodes (8): academy_course_prerequisites, academy_learning_path_courses, academy_learning_paths, academy_peer_reviews, idx_lp_courses_path, idx_peer_reviews_reviewer, idx_peer_reviews_submission, idx_prereqs_course

### Community 36 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, build:pages, clean, deploy:dev, deploy:prod, dev, lint (+1 more)

### Community 37 - "modal_app.py"
Cohesion: 0.14
Nodes (6): jobs(), _local_node(), main(), prune(), _reason(), run_jobs()

### Community 38 - "service-keys.ts"
Cohesion: 0.32
Nodes (7): Env, generateApiKey(), hashApiKey(), onRequestDelete(), onRequestGet(), onRequestOptions(), onRequestPost()

### Community 39 - "verifyAccessJwt.ts"
Cohesion: 0.36
Nodes (7): base64UrlDecodeJson(), base64UrlToUint8Array(), getJwks(), Jwk, JwksCache, VerifiedAccessPayload, verifyAccessJwt()

### Community 40 - "assess.ts"
Cohesion: 0.29
Nodes (6): CORS, Env, generateLocalMockAssessment(), onRequestPost(), @google/genai@^2.4.0, @google/genai

### Community 41 - "i18n.ts"
Cohesion: 0.25
Nodes (7): i18next@^26.3.4, i18next-browser-languagedetector@^8.2.1, react-i18next@^17.0.8, i18next, i18next-browser-languagedetector, react-i18next, resources

### Community 42 - "LessonPath.tsx"
Cohesion: 0.26
Nodes (11): activeStepAt(), buildPath(), doneCount(), PathInput, PathStep, STEP_LABEL, StepId, StepState (+3 more)

### Community 43 - "academy_audit_log"
Cohesion: 0.29
Nodes (6): academy_audit_log, idx_audit_action, idx_audit_actor, idx_audit_created_at, idx_courses_published, idx_users_created_at

### Community 44 - "academy_discussions"
Cohesion: 0.43
Nodes (5): academy_discussions, idx_discussions_course, idx_discussions_lesson, academy_discussion_upvotes, idx_discussion_upvotes_discussion

### Community 45 - "main.tsx"
Cohesion: 0.22
Nodes (4): ErrorBoundary, Props, State, queryClient

### Community 46 - "InteractiveVideoPlayer.tsx"
Cohesion: 0.16
Nodes (27): IndooFace(), InteractiveVideoPlayer(), OPEN_VIDEO_QUESTION, Props, Requirement(), SavePayload, useChirp(), chapterAt() (+19 more)

### Community 47 - "gemini-generate.ts"
Cohesion: 0.40
Nodes (5): buildPrompt(), Env, Mode, onRequestOptions(), onRequestPost()

### Community 48 - "render.mjs"
Cohesion: 0.11
Nodes (26): args, opts, scriptPath, { timeline }, { item, opts }, [itemPath, cacheRoot], buildVideo(), ff() (+18 more)

### Community 49 - "lesson-ai-edit.ts"
Cohesion: 0.06
Nodes (56): AiEnv, gemini(), GEMINI_MODELS, Messages, runAi(), takeSlot(), Env, MODELS (+48 more)

### Community 50 - "academy_orders"
Cohesion: 0.60
Nodes (5): academy_coupons, academy_orders, idx_coupons_code, idx_orders_provider_id, idx_orders_user

### Community 51 - "VideoAiEditPanel.tsx"
Cohesion: 0.31
Nodes (7): Field(), isWelcome(), Props, Scene, Script, setIn(), VideoScenesEditor()

### Community 52 - "ai.mjs"
Cohesion: 0.10
Nodes (35): adapters, AiError, attempt(), chatCompletions(), complete(), DEFAULT_LIMITS, estimateTokens(), failure() (+27 more)

### Community 53 - "download/[credentialId].ts"
Cohesion: 0.70
Nodes (3): onRequestGet(), escapeHtml(), generateCertificateHtml()

### Community 57 - "0007_lms_expanded.sql"
Cohesion: 0.60
Nodes (4): academy_assignment_submissions, academy_assignments, academy_certificates, idx_cert_number

### Community 58 - "0019_course_builder_modules.sql"
Cohesion: 0.60
Nodes (4): academy_assets, academy_lesson_sections, idx_assets_instructor, idx_sections_lesson

### Community 59 - "academy-data.ts"
Cohesion: 0.40
Nodes (4): ACADEMY_CERTIFICATIONS, ACADEMY_COURSES, Certification, Course

### Community 60 - "video-progress.ts"
Cohesion: 0.18
Nodes (23): evaluate(), gradeAnswers(), GradedAnswers, isNum(), MAX_RANGES, mergeRanges(), MIN_WATCHED, normaliseRanges() (+15 more)

### Community 61 - "server.mjs"
Cohesion: 0.18
Nodes (25): ACADEMY_BASE, academyConfigured(), body(), CACHE, createProject(), genJobs, HERE, jobs (+17 more)

### Community 62 - "academy/lessons/[id]/sections.ts"
Cohesion: 0.50
Nodes (3): Env, onRequestOptions(), onRequestPut()

### Community 63 - "[[path]].ts"
Cohesion: 0.67
Nodes (3): Env, onRequestGet(), onRequestHead()

### Community 65 - "academy_quiz_sessions"
Cohesion: 0.83
Nodes (3): academy_quiz_sessions, idx_quiz_sessions_expires, idx_quiz_sessions_user_quiz

### Community 66 - "academy_notifications"
Cohesion: 0.83
Nodes (3): academy_notifications, idx_notifications_is_read, idx_notifications_user_id

### Community 67 - "academy_refresh_tokens"
Cohesion: 0.83
Nodes (3): academy_refresh_tokens, idx_refresh_tokens_hash, idx_refresh_tokens_user

### Community 68 - "academy_quiz_short_answer_submissions"
Cohesion: 0.83
Nodes (3): academy_quiz_short_answer_submissions, idx_qsa_attempt, idx_qsa_status

### Community 69 - "ai-quota.ts"
Cohesion: 0.26
Nodes (12): Env, onRequestGet(), onRequestOptions(), onRequestPost(), today(), MAX_COOLDOWN_MS, MAX_KEYS, parseKeys() (+4 more)

### Community 70 - "scene.test.mjs"
Cohesion: 0.16
Nodes (18): BRAND, cometMark(), lockup(), WAVE_POINTS, frameSvg(), HOLD, ART, stationName() (+10 more)

### Community 73 - "lesson-to-script.mjs"
Cohesion: 0.11
Nodes (34): BASE, [courseId, dir], headers(), upload(), args, [courseId, lessonId, out], buildEditedScript(), checkEditedScript() (+26 more)

### Community 74 - "video/scene.mjs"
Cohesion: 0.22
Nodes (26): bullets(), clamp01(), compare(), ease(), esc(), fitFs(), fitList(), fitTitle() (+18 more)

### Community 86 - "function"
Cohesion: 0.17
Nodes (4): build_from_script(), prune_scene_cache(), web(), write_scripts()

### Community 87 - "setup-2fa.ts"
Cohesion: 0.36
Nodes (7): onRequestOptions(), onRequestPost(), onRequestOptions(), onRequestPost(), base32ToBuf(), generateTOTPSecret(), verifyTOTP()

### Community 88 - "react"
Cohesion: 0.07
Nodes (64): lucide-react, react, AdminApp(), AdminAppInner(), ActivityFeed(), Event, eventConfig, timeAgo() (+56 more)

### Community 89 - "lesson-videos.ts"
Cohesion: 0.38
Nodes (6): buildVideoContent(), safeSrc(), Env, onRequestOptions(), onRequestPatch(), onRequestPost()

### Community 90 - "oracle-runner/package.json"
Cohesion: 0.11
Nodes (22): dependencies, jszip@^3.10.1, kokoro-js@^1.2.1, mammoth@^1.8.0, pdf-parse@^1.1.1, @resvg/resvg-js@^2.6.2, description, engines (+14 more)

### Community 91 - "ai-jobs.ts"
Cohesion: 0.14
Nodes (19): Env, onRequestOptions(), onRequestPost(), Env, j(), JOB_TYPES, onRequestGet(), onRequestOptions() (+11 more)

### Community 92 - "tts.mjs"
Cohesion: 0.43
Nodes (5): chunkText(), load(), synth(), t0, [voice, out]

### Community 93 - "robot.mjs"
Cohesion: 0.26
Nodes (12): clem(), GESTURES, indoo(), indooEye(), joint(), limb(), NAMES, reach() (+4 more)

### Community 94 - "jobs.mjs"
Cohesion: 0.19
Nodes (16): generateJson(), generateText(), stripFences(), lessonPrompt(), outlinePrompt(), reviewLesson(), reviewPrompt(), runJob() (+8 more)

### Community 95 - "api.mjs"
Cohesion: 0.15
Nodes (15): api(), assertConfigured(), BASE, claimJob(), patchJob(), [courseId], out, BASE (+7 more)

### Community 97 - "sfx.mjs"
Cohesion: 0.23
Nodes (10): BUILD, mixSfx(), placeEvents(), RATE, rmsAt(), sceneEvents(), sound(), SOUNDS (+2 more)

### Community 98 - "parse_services.mjs"
Cohesion: 0.29
Nodes (3): content, lines, services

### Community 99 - "scripts.mjs"
Cohesion: 0.13
Nodes (9): args, [courseId, outDir, ids], introAt, results, sleepMax, SAMPLES, children, shutdown() (+1 more)

### Community 100 - "edits.mjs"
Cohesion: 0.20
Nodes (10): GESTURES, LAYOUTS, NOTE_KINDS, prompt(), proposeEdits(), sceneForTime(), SFX, SHAPE (+2 more)

### Community 101 - "MermaidDiagram.tsx"
Cohesion: 0.42
Nodes (6): draw(), hydrateDiagrams(), renderMermaid(), themeFor(), naturalSize(), normalizeMermaid()

### Community 102 - "enrollments/index.ts"
Cohesion: 0.29
Nodes (7): onRequestGet(), onRequestOptions(), onRequestGet(), onRequestOptions(), onRequestPost(), getUnmetPrerequisites(), UnmetPrerequisite

### Community 103 - "course-prerequisites.ts"
Cohesion: 0.33
Nodes (5): Env, onRequestDelete(), onRequestGet(), onRequestOptions(), onRequestPost()

### Community 104 - "useTheme.ts"
Cohesion: 0.31
Nodes (7): apply(), current, listeners, setTheme(), subscribe(), Theme, useTheme()

### Community 105 - "make-video.mjs"
Cohesion: 0.33
Nodes (4): args, script, [scriptPath, outDir], started

### Community 106 - "AIAssistantPanel.tsx"
Cohesion: 0.25
Nodes (7): react-markdown@^10.1.0, remark-gfm@^4.0.1, react-markdown, remark-gfm, AIAssistantPanelProps, Message, PracticeQuestion

### Community 107 - "redemptions.ts"
Cohesion: 0.40
Nodes (4): Env, onRequestGet(), onRequestOptions(), onRequestPost()

### Community 119 - "sonner"
Cohesion: 0.50
Nodes (3): sonner@^2.0.7, sonner, Toast()

## Knowledge Gaps
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `CoursePlayer.tsx`, `react`, `App.tsx`, `NotFound.tsx`, `dependencies`, `package.json`, `AdminLayout.tsx`, `InstructorCourseBuilder.tsx`, `adminFetch`, `LessonPath.tsx`, `main.tsx`, `InteractiveVideoPlayer.tsx`, `VideoAiEditPanel.tsx`, `MermaidDiagram.tsx`, `useTheme.ts`, `AIAssistantPanel.tsx`, `TawkWidget.tsx`, `useTracking.ts`, `AIAssistantWidget.tsx`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.07377295995182175 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `react` to `adminFetch`, `CoursePlayer.tsx`, `react`, `App.tsx`, `NotFound.tsx`, `dependencies`, `AIAssistantPanel.tsx`, `LessonPath.tsx`, `package.json`, `main.tsx`, `InteractiveVideoPlayer.tsx`, `VideoAiEditPanel.tsx`, `AdminLayout.tsx`, `AIAssistantWidget.tsx`, `InstructorCourseBuilder.tsx`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Should `verifyAcademyUser` be split into smaller, more focused modules?**
  _Cohesion score 0.0728744939271255 - nodes in this community are weakly interconnected._
- **Why does `jose` connect `corsOptionsResponse` to `dependencies`, `register.ts`, `package.json`, `setup-2fa.ts`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09268292682926829 - nodes in this community are weakly interconnected._
- **Should `corsOptionsResponse` be split into smaller, more focused modules?**
  _Cohesion score 0.04547858276044421 - nodes in this community are weakly interconnected._