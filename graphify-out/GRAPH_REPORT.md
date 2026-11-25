# Graph Report - academy-main  (2026-11-25)

## Corpus Check
- 274 files · ~176,976 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 6, .stackdump 3, .example 1)

## Summary
- 1368 nodes · 3915 edges · 97 communities (74 shown, 23 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ced2f61a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AdminApp.tsx
- CurriculumBuilder.tsx
- react
- verifyAcademyUser
- App.tsx
- corsOptionsResponse
- src/index.ts
- NotFound.tsx
- corsOptionsResponse
- dependencies
- errorResponse
- register.ts
- package.json
- hasPermission
- corsResponse
- errorResponse
- 0003_academy_schema.sql
- 0001_initial_schema.sql
- logAdminAction
- auth/middleware.ts
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
- fetch_wiki.py
- 0026_learning_paths.sql
- scripts
- HapticButton
- service-keys.ts
- verifyAccessJwt.ts
- assess.ts
- i18n.ts
- useAcademy
- academy_audit_log
- academy_discussions
- main.tsx
- academy/courses.ts
- gemini-generate.ts
- academy/grading.ts
- peer-reviews.ts
- academy_orders
- gemini-generate-course.ts
- redemptions.ts
- download/[credentialId].ts
- enquiry.ts
- subscribe.ts
- track.ts
- 0007_lms_expanded.sql
- 0019_course_builder_modules.sql
- academy-data.ts
- TawkWidget.tsx
- gemini-check.ts
- academy/lessons/[id]/sections.ts
- [[path]].ts
- tawkto.ts
- academy_quiz_sessions
- academy_notifications
- academy_refresh_tokens
- academy_quiz_short_answer_submissions
- CourseBuilderPage.tsx
- ContractLine.tsx
- ApiError
- 0027_service_api_keys.sql
- useTracking.ts
- 0002_subscribers.sql
- 0028_instructor_and_referral_v2.sql
- DashboardPage.tsx
- setup-2fa.ts
- SubmissionsPage.tsx
- Button.tsx
- parse_services.mjs
- CourseDetail.tsx
- dev.mjs
- NotificationsPage.tsx
- ReportsPage.tsx
- Certifications.tsx
- @sentry/react

## God Nodes (most connected - your core abstractions)
1. `verifyAdminRequest()` - 136 edges
2. `corsResponse()` - 131 edges
3. `errorResponse()` - 127 edges
4. `errorResponse()` - 123 edges
5. `verifyAcademyUser()` - 118 edges
6. `corsOptionsResponse()` - 113 edges
7. `hasPermission()` - 104 edges
8. `corsResponse()` - 99 edges
9. `logAdminAction()` - 90 edges
10. `corsOptionsResponse()` - 87 edges

## Surprising Connections (you probably didn't know these)
- `onRequestOptions()` --calls--> `corsOptionsResponse()`  [EXTRACTED]
  functions/api/academy/admin/users.ts → functions/api/academy/auth/middleware.ts
- `onRequestOptions()` --calls--> `corsOptionsResponse()`  [EXTRACTED]
  functions/api/academy/admin/users/[id].ts → functions/api/academy/auth/middleware.ts
- `onRequestOptions()` --calls--> `corsOptionsResponse()`  [EXTRACTED]
  functions/api/academy/ai/ask.ts → functions/api/academy/auth/middleware.ts
- `onRequestOptions()` --calls--> `corsOptionsResponse()`  [EXTRACTED]
  functions/api/academy/assignments/[id].ts → functions/api/academy/auth/middleware.ts
- `onRequestOptions()` --calls--> `corsOptionsResponse()`  [EXTRACTED]
  functions/api/academy/auth/change-password.ts → functions/api/academy/auth/middleware.ts

## Import Cycles
- None detected.

## Communities (97 total, 23 thin omitted)

### Community 0 - "AdminApp.tsx"
Cohesion: 0.13
Nodes (31): AdminAppInner(), Column, DataTable(), DataTableProps, useD1Query(), Certificate, CertificatesPage(), Coupon (+23 more)

### Community 1 - "CurriculumBuilder.tsx"
Cohesion: 0.10
Nodes (27): AssignmentBlockEditor(), AssignmentBlockEditorProps, AssignmentTemplate, BlockType, LessonBlock, LessonBlockEditor(), LessonBlockEditorProps, QType (+19 more)

### Community 2 - "react"
Cohesion: 0.15
Nodes (20): lucide-react, react, react-helmet-async, react-router-dom, academyAPI, API_BASE, APIError, fetchAPI() (+12 more)

### Community 3 - "verifyAcademyUser"
Cohesion: 0.07
Nodes (44): onRequestDelete(), onRequestOptions(), onRequestPut(), onRequestGet(), onRequestOptions(), onRequestGet(), onRequestOptions(), onRequestPost() (+36 more)

### Community 4 - "App.tsx"
Cohesion: 0.10
Nodes (34): AcademyProvider(), AcademyHomeComponent, AdminAppComponent, App(), AppLayout(), BARE_LAYOUT_ROUTES, CertificationsComponent, CheckoutComponent (+26 more)

### Community 5 - "corsOptionsResponse"
Cohesion: 0.05
Nodes (42): onRequestOptions(), Env, onRequestGet(), onRequestOptions(), Env, onRequestGet(), onRequestOptions(), Env (+34 more)

### Community 6 - "src/index.ts"
Cohesion: 0.06
Nodes (45): bin, spotclm-academy-mcp, dependencies, @modelcontextprotocol/sdk@^1.12.0, zod@^3.23.8, description, devDependencies, @types/node@^20.14.0 (+37 more)

### Community 7 - "NotFound.tsx"
Cohesion: 0.11
Nodes (36): motion, AssessmentTool(), AssessmentToolProps, EnquiryForm(), EnquiryFormProps, getAudioContext(), HapticButtonProps, hapticSettings (+28 more)

### Community 8 - "corsOptionsResponse"
Cohesion: 0.06
Nodes (32): onRequestOptions(), onRequestPost(), corsOptionsResponse(), getCorsHeaders(), onRequestGet(), onRequestOptions(), onRequestOptions(), onRequestOptions() (+24 more)

### Community 9 - "dependencies"
Cohesion: 0.05
Nodes (43): dependencies, bcryptjs@^3.0.3, canvas-confetti@^1.9.4, dompurify@^3.4.11, @headlessui/react@^2.2.10, @hookform/resolvers@^5.4.0, jose@^6.2.3, katex@^0.17.0 (+35 more)

### Community 10 - "errorResponse"
Cohesion: 0.17
Nodes (26): errorResponse(), onRequestPost(), onRequestPost(), onRequestGet(), onRequestGet(), onRequestPost(), assertOwnsCourse(), assertOwnsLesson() (+18 more)

### Community 11 - "register.ts"
Cohesion: 0.15
Nodes (20): onRequestOptions(), onRequestPost(), handleFailedLogin(), onRequestOptions(), onRequestPost(), onRequestGet(), onRequestOptions(), onRequestPatch() (+12 more)

### Community 12 - "package.json"
Cohesion: 0.07
Nodes (37): devDependencies, autoprefixer@^10.4.21, @cloudflare/workers-types@^4.20260629.1, esbuild@^0.25.0, jsdom@^29.1.1, @playwright/test@^1.61.1, tailwindcss@^4.1.14, tsx@^4.21.0 (+29 more)

### Community 13 - "hasPermission"
Cohesion: 0.10
Nodes (24): Env, onRequestDelete(), onRequestGet(), onRequestOptions(), onRequestPost(), Env, onRequestDelete(), onRequestGet() (+16 more)

### Community 14 - "corsResponse"
Cohesion: 0.11
Nodes (23): Env, onRequestDelete(), onRequestGet(), onRequestOptions(), onRequestPost(), Env, onRequestDelete(), onRequestGet() (+15 more)

### Community 15 - "errorResponse"
Cohesion: 0.12
Nodes (22): Env, onRequestDelete(), onRequestGet(), onRequestPost(), onRequestPut(), Env, onRequestGet(), onRequestOptions() (+14 more)

### Community 16 - "0003_academy_schema.sql"
Cohesion: 0.14
Nodes (24): academy_courses, academy_credit_redemptions, academy_enrollments, academy_modules, academy_payments, academy_quiz_attempts, academy_quiz_questions, academy_quizzes (+16 more)

### Community 17 - "0001_initial_schema.sql"
Cohesion: 0.12
Nodes (22): activity_events, admin_audit_log, admin_users, assessment_submissions, chat_messages, chat_sessions, email_audit, email_templates (+14 more)

### Community 18 - "logAdminAction"
Cohesion: 0.12
Nodes (19): Env, onRequestOptions(), onRequestPost(), Env, onRequestOptions(), onRequestPost(), Env, onRequestOptions() (+11 more)

### Community 19 - "auth/middleware.ts"
Cohesion: 0.08
Nodes (26): GeneratedQuestion, onRequestOptions(), onRequestPost(), onRequestOptions(), onRequestPost(), AcademyContext, AcademyUser, CORS_HEADERS (+18 more)

### Community 20 - "verifyAdminRequest"
Cohesion: 0.14
Nodes (18): Env, onRequestDelete(), onRequestGet(), onRequestPost(), onRequestPut(), Env, onRequestDelete(), onRequestGet() (+10 more)

### Community 21 - "progress.ts"
Cohesion: 0.24
Nodes (16): awardBadge(), awardPoints(), BADGE_SLUGS, onCertificateIssued(), onCourseCompleted(), onLessonCompleted(), onQuizPassed(), POINTS (+8 more)

### Community 22 - "server.ts"
Cohesion: 0.13
Nodes (12): compression@^1.8.1, dotenv@^17.2.3, express@^5.2.1, helmet@^8.2.0, vite@^6.2.3, vite@^6.2.3, compression, dotenv (+4 more)

### Community 23 - "AdminLayout.tsx"
Cohesion: 0.11
Nodes (21): AdminApp(), academyNavItems, AdminLayout(), bottomNavItems, navItems, PermissionGate(), RoleGate(), AdminAuthContext (+13 more)

### Community 24 - "InstructorCourseBuilder.tsx"
Cohesion: 0.23
Nodes (11): Block, BlockType, Course, InstructorAssignmentBlock(), InstructorCourseBuilderComponent(), InstructorLessonEditor(), InstructorQuizBlock(), Lesson (+3 more)

### Community 25 - "prerender.mjs"
Cohesion: 0.19
Nodes (11): @tailwindcss/vite@^4.1.14, @tailwindcss/vite, baseHtml, buildHtml(), distDir, indexPath, pages, replaceCanonical() (+3 more)

### Community 26 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+8 more)

### Community 27 - "Env"
Cohesion: 0.26
Nodes (10): Env, onRequestOptions(), onRequestPost(), awardReferralCommission(), clawbackReferralCredits(), onRequestGet(), onRequestOptions(), verifyCertificate() (+2 more)

### Community 28 - "import-zip.ts"
Cohesion: 0.18
Nodes (12): CONTENT_TYPES, Env, extOf(), IMAGE_EXT, onRequestOptions(), onRequestPost(), parsePrefixed(), PendingSection (+4 more)

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
Cohesion: 0.10
Nodes (29): AiStudioTab(), GeneratedQuestion, LessonOption, Mode, Module, MarkdownAiEditor(), MarkdownAiEditorProps, adminFetch() (+21 more)

### Community 33 - "vitest"
Cohesion: 0.20
Nodes (8): @vitejs/plugin-react@^5.0.4, @testing-library/jest-dom@^6.9.1, @testing-library/react@^16.3.2, vitest@^4.1.9, @testing-library/jest-dom, @testing-library/react, @vitejs/plugin-react, vitest

### Community 35 - "0026_learning_paths.sql"
Cohesion: 0.36
Nodes (8): academy_course_prerequisites, academy_learning_path_courses, academy_learning_paths, academy_peer_reviews, idx_lp_courses_path, idx_peer_reviews_reviewer, idx_peer_reviews_submission, idx_prereqs_course

### Community 36 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, build:pages, clean, deploy:dev, deploy:prod, dev, lint (+1 more)

### Community 37 - "HapticButton"
Cohesion: 0.12
Nodes (27): dompurify, react-markdown, remark-gfm, AIAssistantWidgetProps, Message, HapticButton(), readStoredTheme(), Theme (+19 more)

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

### Community 42 - "useAcademy"
Cohesion: 0.16
Nodes (18): useAcademy(), CourseThumbnail(), CourseThumbnailProps, FALLBACK_GRADIENTS, pickGradient(), CoursesComponent(), BADGE_ICONS, DashboardComponent() (+10 more)

### Community 43 - "academy_audit_log"
Cohesion: 0.29
Nodes (6): academy_audit_log, idx_audit_action, idx_audit_actor, idx_audit_created_at, idx_courses_published, idx_users_created_at

### Community 44 - "academy_discussions"
Cohesion: 0.43
Nodes (5): academy_discussions, idx_discussions_course, idx_discussions_lesson, academy_discussion_upvotes, idx_discussion_upvotes_discussion

### Community 45 - "main.tsx"
Cohesion: 0.14
Nodes (10): react-dom, @tanstack/react-query, ErrorBoundary, Props, State, LiveChatModal(), LiveChatProps, Message (+2 more)

### Community 46 - "academy/courses.ts"
Cohesion: 0.33
Nodes (5): Env, onRequestGet(), onRequestOptions(), onRequestPost(), onRequestPut()

### Community 47 - "gemini-generate.ts"
Cohesion: 0.40
Nodes (5): buildPrompt(), Env, Mode, onRequestOptions(), onRequestPost()

### Community 48 - "academy/grading.ts"
Cohesion: 0.40
Nodes (5): Env, onRequestGet(), onRequestOptions(), onRequestPost(), recomputeQuizAttemptScore()

### Community 49 - "peer-reviews.ts"
Cohesion: 0.33
Nodes (5): Env, onRequestDelete(), onRequestGet(), onRequestOptions(), onRequestPost()

### Community 50 - "academy_orders"
Cohesion: 0.60
Nodes (5): academy_coupons, academy_orders, idx_coupons_code, idx_orders_provider_id, idx_orders_user

### Community 51 - "gemini-generate-course.ts"
Cohesion: 0.40
Nodes (4): Brief, Env, onRequestOptions(), onRequestPost()

### Community 52 - "redemptions.ts"
Cohesion: 0.40
Nodes (4): Env, onRequestGet(), onRequestOptions(), onRequestPost()

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

### Community 61 - "gemini-check.ts"
Cohesion: 0.50
Nodes (3): Env, onRequestOptions(), onRequestPost()

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

### Community 69 - "CourseBuilderPage.tsx"
Cohesion: 0.20
Nodes (13): Asset, AssetManagerModal(), AssetManagerModalProps, formatSize(), iconFor(), Course, CourseBuilderPage(), CoursePrerequisitesEditor() (+5 more)

### Community 86 - "DashboardPage.tsx"
Cohesion: 0.22
Nodes (10): ActivityFeed(), Event, eventConfig, timeAgo(), colorMap, StatCard(), StatCardProps, DashboardData (+2 more)

### Community 87 - "setup-2fa.ts"
Cohesion: 0.36
Nodes (7): onRequestOptions(), onRequestPost(), onRequestOptions(), onRequestPost(), base32ToBuf(), generateTOTPSecret(), verifyTOTP()

### Community 88 - "SubmissionsPage.tsx"
Cohesion: 0.29
Nodes (6): EmailComposer(), EmailComposerProps, Template, Assessment, Enquiry, Tab

### Community 89 - "Button.tsx"
Cohesion: 0.25
Nodes (7): Button(), ButtonProps, Size, sizes, Variant, variants, NotFoundComponent()

### Community 90 - "parse_services.mjs"
Cohesion: 0.29
Nodes (3): content, lines, services

### Community 91 - "CourseDetail.tsx"
Cohesion: 0.60
Nodes (5): @headlessui/react, CertificationSection(), CourseDetailComponent(), ReviewsSection(), StarRow()

### Community 92 - "dev.mjs"
Cohesion: 0.40
Nodes (3): children, shutdown(), start()

### Community 93 - "NotificationsPage.tsx"
Cohesion: 0.50
Nodes (3): Audience, Course, Student

### Community 94 - "ReportsPage.tsx"
Cohesion: 0.50
Nodes (3): colorMap, EXPORTS, ReportsPage()

### Community 95 - "Certifications.tsx"
Cohesion: 0.67
Nodes (3): CertificationsComponent(), TiltCard(), VerifyResult

## Knowledge Gaps
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `jszip` connect `import-zip.ts` to `CurriculumBuilder.tsx`, `package.json`?**
  _High betweenness centrality (0.263) - this node is a cross-community bridge._
- **Should `AdminApp.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `jose` connect `auth/middleware.ts` to `dependencies`, `register.ts`, `package.json`, `setup-2fa.ts`?**
  _High betweenness centrality (0.217) - this node is a cross-community bridge._
- **Should `CurriculumBuilder.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0967741935483871 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `AdminApp.tsx`, `CurriculumBuilder.tsx`, `App.tsx`, `NotFound.tsx`, `dependencies`, `package.json`, `AdminLayout.tsx`, `InstructorCourseBuilder.tsx`, `adminFetch`, `HapticButton`, `useAcademy`, `main.tsx`, `TawkWidget.tsx`, `CourseBuilderPage.tsx`, `ContractLine.tsx`, `useTracking.ts`, `DashboardPage.tsx`, `SubmissionsPage.tsx`, `Button.tsx`, `CourseDetail.tsx`, `NotificationsPage.tsx`, `ReportsPage.tsx`, `Certifications.tsx`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.1465149359886202 - nodes in this community are weakly interconnected._
- **Should `verifyAcademyUser` be split into smaller, more focused modules?**
  _Cohesion score 0.06779661016949153 - nodes in this community are weakly interconnected._