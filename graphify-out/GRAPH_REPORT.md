# Graph Report - academy-main  (2026-11-26)

## Corpus Check
- 352 files · ~240,267 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 21 file(s) not represented in the graph (top: (none) 7, .ttf 4, .stackdump 3)

## Summary
- 1986 nodes · 5440 edges · 118 communities (91 shown, 27 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `52f33387`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AdminApp.tsx
- adminFetch
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
- CourseWizardPage.tsx
- vitest
- modal_app.py
- 0026_learning_paths.sql
- scripts
- motion
- service-keys.ts
- verifyAccessJwt.ts
- assess.ts
- i18n.ts
- Dashboard.tsx
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
- QuizAiPanel.tsx
- scene.test.mjs
- ApiError
- 0027_service_api_keys.sql
- lesson-to-script.mjs
- video/scene.mjs
- 0002_subscribers.sql
- 0028_instructor_and_referral_v2.sql
- DashboardPage.tsx
- setup-2fa.ts
- react
- Button.tsx
- oracle-runner/package.json
- ai-jobs.ts
- voice-demo.mjs
- robot.mjs
- jobs.mjs
- api.mjs
- @sentry/react
- sfx.mjs
- CurriculumBuilder.tsx
- scripts.mjs
- edits.mjs
- lesson-videos.ts
- enrollments/index.ts
- vite
- useTheme.ts
- make-video.mjs
- course-prerequisites.ts
- redemptions.ts
- 0030_ai_jobs.sql
- 0031_video_progress.sql
- 0032_ai_usage.sql
- TawkWidget.tsx
- @hookform/resolvers@^5.4.0
- APIError
- useTracking.ts

## God Nodes (most connected - your core abstractions)
1. `verifyAdminRequest()` - 152 edges
2. `corsResponse()` - 147 edges
3. `errorResponse()` - 139 edges
4. `errorResponse()` - 130 edges
5. `verifyAcademyUser()` - 121 edges
6. `hasPermission()` - 116 edges
7. `corsOptionsResponse()` - 115 edges
8. `corsResponse()` - 102 edges
9. `corsOptionsResponse()` - 101 edges
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
- `Proposal` --references--> `QuizQ`  [EXTRACTED]
  src/admin/components/builder/QuizAiPanel.tsx → functions/api/admin/academy/_quizEdit.ts

## Import Cycles
- None detected.

## Communities (118 total, 27 thin omitted)

### Community 0 - "AdminApp.tsx"
Cohesion: 0.13
Nodes (33): AdminApp(), AdminAppInner(), AdminLayout(), DataTable(), PermissionGate(), RoleGate(), useAdminAuth(), useD1Query() (+25 more)

### Community 1 - "adminFetch"
Cohesion: 0.10
Nodes (29): AiTextChange(), Props, Asset, AssetManagerModal(), AssetManagerModalProps, formatSize(), iconFor(), AssignmentBlockEditor() (+21 more)

### Community 2 - "react"
Cohesion: 0.12
Nodes (35): @headlessui/react, react-helmet-async, react-router-dom, academyAPI, API_BASE, AcademyContext, AcademyContextType, useAcademy() (+27 more)

### Community 3 - "verifyAcademyUser"
Cohesion: 0.07
Nodes (28): onRequestGet(), onRequestOptions(), onRequestPost(), corsResponse(), onRequestGet(), onRequestOptions(), onRequestGet(), onRequestOptions() (+20 more)

### Community 4 - "App.tsx"
Cohesion: 0.10
Nodes (34): AcademyProvider(), AcademyHomeComponent, AdminAppComponent, App(), AppLayout(), BARE_LAYOUT_ROUTES, CertificationsComponent, CheckoutComponent (+26 more)

### Community 5 - "corsOptionsResponse"
Cohesion: 0.05
Nodes (49): Env, onRequestOptions(), onRequestPatch(), onRequestOptions(), Env, onRequestGet(), onRequestOptions(), Env (+41 more)

### Community 6 - "src/index.ts"
Cohesion: 0.06
Nodes (45): bin, spotclm-academy-mcp, dependencies, @modelcontextprotocol/sdk@^1.12.0, zod@^3.23.8, description, devDependencies, @types/node@^20.14.0 (+37 more)

### Community 7 - "NotFound.tsx"
Cohesion: 0.13
Nodes (29): AssessmentTool(), AssessmentToolProps, EnquiryForm(), EnquiryFormProps, getAudioContext(), playPremiumHapticSound(), SubscribeForm(), InteractiveService (+21 more)

### Community 8 - "getCorsHeaders"
Cohesion: 0.38
Nodes (5): getCorsHeaders(), onRequestGet(), onRequestOptions(), onRequestGet(), onRequestOptions()

### Community 9 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, bcryptjs@^3.0.3, canvas-confetti@^1.9.4, dompurify@^3.4.11, @headlessui/react@^2.2.10, jose@^6.2.3, jszip@^3.10.1, katex@^0.17.0 (+33 more)

### Community 10 - "errorResponse"
Cohesion: 0.12
Nodes (45): onRequestDelete(), onRequestPut(), onRequestGet(), onRequestGet(), errorResponse(), requireRole(), verifyAcademyUser(), onRequestPost() (+37 more)

### Community 11 - "register.ts"
Cohesion: 0.15
Nodes (19): onRequestOptions(), onRequestPost(), handleFailedLogin(), onRequestOptions(), onRequestPost(), onRequestOptions(), onRequestPatch(), hashIp() (+11 more)

### Community 12 - "package.json"
Cohesion: 0.07
Nodes (38): devDependencies, autoprefixer@^10.4.21, @cloudflare/workers-types@^4.20260629.1, esbuild@^0.25.0, jsdom@^29.1.1, @playwright/test@^1.61.1, tailwindcss@^4.1.14, tsx@^4.21.0 (+30 more)

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
Cohesion: 0.17
Nodes (9): compression@^1.8.1, dotenv@^17.2.3, express@^5.2.1, helmet@^8.2.0, compression, dotenv, express, helmet (+1 more)

### Community 23 - "AdminLayout.tsx"
Cohesion: 0.18
Nodes (11): academyNavItems, bottomNavItems, navItems, AdminAuthContext, AdminAuthProvider(), AdminAuthValue, AdminUser, inertDefault (+3 more)

### Community 24 - "InstructorCourseBuilder.tsx"
Cohesion: 0.15
Nodes (14): instructorAPI, Block, BlockType, Course, InstructorAssignmentBlock(), InstructorCourseBuilderComponent(), InstructorLessonEditor(), InstructorQuizBlock() (+6 more)

### Community 25 - "prerender.mjs"
Cohesion: 0.15
Nodes (12): content, lines, services, baseHtml, buildHtml(), distDir, indexPath, pages (+4 more)

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

### Community 32 - "CourseWizardPage.tsx"
Cohesion: 0.10
Nodes (26): AiStudioTab(), GeneratedQuestion, LessonOption, Mode, Module, MarkdownAiEditor(), MarkdownAiEditorProps, Applied (+18 more)

### Community 33 - "vitest"
Cohesion: 0.40
Nodes (4): @testing-library/jest-dom@^6.9.1, @testing-library/react@^16.3.2, @testing-library/jest-dom, @testing-library/react

### Community 34 - "modal_app.py"
Cohesion: 0.06
Nodes (19): fetch_wiki_logo(), build_from_script(), _build_from_script(), build_lesson(), drain_video_jobs(), jobs(), _local_node(), main() (+11 more)

### Community 35 - "0026_learning_paths.sql"
Cohesion: 0.36
Nodes (8): academy_course_prerequisites, academy_learning_path_courses, academy_learning_paths, academy_peer_reviews, idx_lp_courses_path, idx_peer_reviews_reviewer, idx_peer_reviews_submission, idx_prereqs_course

### Community 36 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, build:pages, clean, deploy:dev, deploy:prod, dev, lint (+1 more)

### Community 37 - "motion"
Cohesion: 0.15
Nodes (8): motion, react-dom, AIAssistantWidgetProps, Message, NODE_COLORS, LiveChatModal(), LiveChatProps, Message

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

### Community 42 - "Dashboard.tsx"
Cohesion: 0.24
Nodes (11): CourseThumbnail(), CourseThumbnailProps, FALLBACK_GRADIENTS, pickGradient(), BADGE_ICONS, DashboardComponent(), GamificationCard(), ProgressRing() (+3 more)

### Community 43 - "academy_audit_log"
Cohesion: 0.29
Nodes (6): academy_audit_log, idx_audit_action, idx_audit_actor, idx_audit_created_at, idx_courses_published, idx_users_created_at

### Community 44 - "academy_discussions"
Cohesion: 0.43
Nodes (5): academy_discussions, idx_discussions_course, idx_discussions_lesson, academy_discussion_upvotes, idx_discussion_upvotes_discussion

### Community 45 - "main.tsx"
Cohesion: 0.14
Nodes (9): @tanstack/react-query, ErrorBoundary, Props, State, AcademyNotification, NotificationBell(), timeAgo(), Toast() (+1 more)

### Community 46 - "InteractiveVideoPlayer.tsx"
Cohesion: 0.06
Nodes (72): react-markdown@^10.1.0, remark-gfm@^4.0.1, dompurify, react-markdown, remark-gfm, vitest, draw(), hydrateDiagrams() (+64 more)

### Community 47 - "gemini-generate.ts"
Cohesion: 0.40
Nodes (5): buildPrompt(), Env, Mode, onRequestOptions(), onRequestPost()

### Community 48 - "render.mjs"
Cohesion: 0.13
Nodes (22): args, opts, scriptPath, { timeline }, { item, opts }, [itemPath, cacheRoot], buildVideo(), ff() (+14 more)

### Community 49 - "lesson-ai-edit.ts"
Cohesion: 0.06
Nodes (52): AiEnv, gemini(), GEMINI_MODELS, Messages, runAi(), takeSlot(), Env, MODELS (+44 more)

### Community 50 - "academy_orders"
Cohesion: 0.60
Nodes (5): academy_coupons, academy_orders, idx_coupons_code, idx_orders_provider_id, idx_orders_user

### Community 51 - "VideoAiEditPanel.tsx"
Cohesion: 0.21
Nodes (11): Job, Props, QUICK, VideoAiEditPanel(), Field(), isWelcome(), Props, Scene (+3 more)

### Community 52 - "ai.mjs"
Cohesion: 0.12
Nodes (28): adapters, AiError, attempt(), chatCompletions(), complete(), DEFAULT_LIMITS, estimateTokens(), failure() (+20 more)

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
Cohesion: 0.28
Nodes (7): ACADEMY_CERTIFICATIONS, ACADEMY_COURSES, Certification, Course, CertificationsComponent(), TiltCard(), VerifyResult

### Community 60 - "video-progress.ts"
Cohesion: 0.18
Nodes (23): evaluate(), gradeAnswers(), GradedAnswers, isNum(), MAX_RANGES, mergeRanges(), MIN_WATCHED, normaliseRanges() (+15 more)

### Community 61 - "server.mjs"
Cohesion: 0.17
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

### Community 69 - "QuizAiPanel.tsx"
Cohesion: 0.24
Nodes (13): QuizChange, QuizQ, answerText(), BADGE, body(), del(), LABEL, post() (+5 more)

### Community 70 - "scene.test.mjs"
Cohesion: 0.15
Nodes (18): BRAND, cometMark(), lockup(), WAVE_POINTS, frameSvg(), HOLD, ART, STATIONS (+10 more)

### Community 73 - "lesson-to-script.mjs"
Cohesion: 0.11
Nodes (34): BASE, [courseId, dir], headers(), upload(), args, [courseId, lessonId, out], buildEditedScript(), checkEditedScript() (+26 more)

### Community 74 - "video/scene.mjs"
Cohesion: 0.23
Nodes (25): bullets(), clamp01(), compare(), ease(), esc(), fitFs(), fitList(), fitTitle() (+17 more)

### Community 86 - "DashboardPage.tsx"
Cohesion: 0.22
Nodes (10): ActivityFeed(), Event, eventConfig, timeAgo(), colorMap, StatCard(), StatCardProps, DashboardData (+2 more)

### Community 87 - "setup-2fa.ts"
Cohesion: 0.36
Nodes (7): onRequestOptions(), onRequestPost(), onRequestOptions(), onRequestPost(), base32ToBuf(), generateTOTPSecret(), verifyTOTP()

### Community 88 - "react"
Cohesion: 0.11
Nodes (24): lucide-react, react, Column, DataTableProps, EmailComposer(), EmailComposerProps, Template, QueryState (+16 more)

### Community 89 - "Button.tsx"
Cohesion: 0.25
Nodes (7): Button(), ButtonProps, Size, sizes, Variant, variants, NotFoundComponent()

### Community 90 - "oracle-runner/package.json"
Cohesion: 0.11
Nodes (22): dependencies, jszip@^3.10.1, kokoro-js@^1.2.1, mammoth@^1.8.0, pdf-parse@^1.1.1, @resvg/resvg-js@^2.6.2, description, engines (+14 more)

### Community 91 - "ai-jobs.ts"
Cohesion: 0.14
Nodes (19): Env, onRequestOptions(), onRequestPost(), Env, j(), JOB_TYPES, onRequestGet(), onRequestOptions() (+11 more)

### Community 92 - "voice-demo.mjs"
Cohesion: 0.16
Nodes (13): chunkText(), load(), synth(), wavBuffer(), SAMPLES, t0, [voice, out], CLEAN (+5 more)

### Community 93 - "robot.mjs"
Cohesion: 0.26
Nodes (12): clem(), GESTURES, indoo(), indooEye(), joint(), limb(), NAMES, reach() (+4 more)

### Community 94 - "jobs.mjs"
Cohesion: 0.19
Nodes (17): generateJson(), generateText(), reviewEnabled(), stripFences(), lessonPrompt(), outlinePrompt(), reviewLesson(), reviewPrompt() (+9 more)

### Community 95 - "api.mjs"
Cohesion: 0.22
Nodes (12): api(), assertConfigured(), BASE, claimJob(), patchJob(), [courseId], out, COURSE_JOBS (+4 more)

### Community 97 - "sfx.mjs"
Cohesion: 0.23
Nodes (10): BUILD, mixSfx(), placeEvents(), RATE, rmsAt(), sceneEvents(), sound(), SOUNDS (+2 more)

### Community 98 - "CurriculumBuilder.tsx"
Cohesion: 0.13
Nodes (21): LessonBlock, LessonBlockEditor(), ConfirmDeleteModal(), CurriculumBuilder(), InlineNameModal(), Lesson, LessonSettingsModal(), Module (+13 more)

### Community 99 - "scripts.mjs"
Cohesion: 0.14
Nodes (8): BASE, chapters, [dir, lessonId, name, replaceVideoId], args, [courseId, outDir, ids], introAt, results, sleepMax

### Community 100 - "edits.mjs"
Cohesion: 0.19
Nodes (11): GESTURES, LAYOUTS, NOTE_KINDS, prompt(), proposeEdits(), sceneForTime(), SFX, SHAPE (+3 more)

### Community 101 - "lesson-videos.ts"
Cohesion: 0.38
Nodes (6): buildVideoContent(), safeSrc(), Env, onRequestOptions(), onRequestPatch(), onRequestPost()

### Community 102 - "enrollments/index.ts"
Cohesion: 0.29
Nodes (7): onRequestGet(), onRequestOptions(), onRequestGet(), onRequestOptions(), onRequestPost(), getUnmetPrerequisites(), UnmetPrerequisite

### Community 103 - "vite"
Cohesion: 0.20
Nodes (7): @tailwindcss/vite@^4.1.14, vite@^6.2.3, @vitejs/plugin-react@^5.0.4, vite@^6.2.3, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 104 - "useTheme.ts"
Cohesion: 0.27
Nodes (8): apply(), current, listeners, setTheme(), subscribe(), Theme, useTheme(), SettingsComponent()

### Community 105 - "make-video.mjs"
Cohesion: 0.33
Nodes (4): args, script, [scriptPath, outDir], started

### Community 106 - "course-prerequisites.ts"
Cohesion: 0.33
Nodes (5): Env, onRequestDelete(), onRequestGet(), onRequestOptions(), onRequestPost()

### Community 107 - "redemptions.ts"
Cohesion: 0.40
Nodes (4): Env, onRequestGet(), onRequestOptions(), onRequestPost()

### Community 112 - "@hookform/resolvers@^5.4.0"
Cohesion: 0.33
Nodes (4): @hookform/resolvers@^5.4.0, react-hook-form@^7.80.0, @hookform/resolvers, react-hook-form

## Knowledge Gaps
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `AdminApp.tsx`, `adminFetch`, `react`, `App.tsx`, `NotFound.tsx`, `dependencies`, `package.json`, `AdminLayout.tsx`, `InstructorCourseBuilder.tsx`, `CourseWizardPage.tsx`, `motion`, `Dashboard.tsx`, `main.tsx`, `InteractiveVideoPlayer.tsx`, `VideoAiEditPanel.tsx`, `academy-data.ts`, `QuizAiPanel.tsx`, `DashboardPage.tsx`, `Button.tsx`, `CurriculumBuilder.tsx`, `useTheme.ts`, `TawkWidget.tsx`, `useTracking.ts`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Should `AdminApp.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12775842044134728 - nodes in this community are weakly interconnected._
- **Why does `jose` connect `corsOptionsResponse` to `dependencies`, `register.ts`, `package.json`, `setup-2fa.ts`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Should `adminFetch` be split into smaller, more focused modules?**
  _Cohesion score 0.10317460317460317 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `react` to `AdminApp.tsx`, `adminFetch`, `react`, `App.tsx`, `NotFound.tsx`, `dependencies`, `package.json`, `AdminLayout.tsx`, `InstructorCourseBuilder.tsx`, `CourseWizardPage.tsx`, `motion`, `Dashboard.tsx`, `main.tsx`, `InteractiveVideoPlayer.tsx`, `VideoAiEditPanel.tsx`, `academy-data.ts`, `QuizAiPanel.tsx`, `DashboardPage.tsx`, `CurriculumBuilder.tsx`, `useTheme.ts`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.11686274509803922 - nodes in this community are weakly interconnected._
- **Should `verifyAcademyUser` be split into smaller, more focused modules?**
  _Cohesion score 0.0728744939271255 - nodes in this community are weakly interconnected._