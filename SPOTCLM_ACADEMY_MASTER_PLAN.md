# SpotCLM Academy — Enterprise LMS Master Plan

**Status:** Proof-of-concept → Enterprise-grade LMS
**Brand parent:** SpotCLM (must inherit navy/indigo token system, glassmorphism, `PremiumHero`/`BottomCTA`/`HapticButton` patterns from the main SpotCLM codebase)
**Sequencing chosen by stakeholder:** Premium UI/UX first; security hardening runs as a parallel workstream (not deferred — parallel, with a small set of "cannot ship without" items called out explicitly below)
**Payments:** Razorpay (India/INR) + Stripe (international/USD), dual integration
**Video:** Cloudflare Stream for the core course player where watch-time/anti-cheat integrity matters; lightweight `<video>`/YouTube embeds retained for supplementary content

---

## 1. Current State — What The Audits Found

Two independent full-repo audits (backend/schema, frontend/UX) converged on the same picture: **a well-designed data model and a genuinely good CSS design-token system, sitting underneath a shell of non-functional admin UI and several exploitable business-logic gaps.** This is better news than a rewrite from zero — most of migrations 0001–0007 and the `index.css` token system are worth keeping and building on, not discarding.

### 1.1 Auth
- Two disconnected auth systems: custom HS256 JWT (students, `jose`+`bcryptjs`) vs. Cloudflare Access RS256 JWT (admin). Both are cryptographically sound where implemented.
- **No `Secure` flag on any cookie** — a TODO comment left directly in `register.ts`.
- Refresh tokens live only in Workers KV (30-day TTL, single-use rotation) — no durable session table, so a user can't see/revoke active sessions, and there's no revocation-on-password-change.
- `is_email_verified` and `locked_until` columns exist in schema but are **dead** — never read or written by any handler (lockout is done via a separate KV mechanism instead — two competing, only one wired up).
- Admin dev-bypass (`Authorization: Bearer <email>` trusted when `env.ENV === 'development'`) is a live footgun if env vars are ever misconfigured in prod.
- **Client-side admin dev-bypass is worse**: `useAdminAuth.ts` reads `localStorage.getItem('spotclm_admin_dev')` with no build-time guard — callable from any browser console in a shipped bundle to self-grant `superadmin`.
- `referrals/credits.ts` and `referrals/tree.ts` have a **broken auth check** — `verifyAcademyUser` never returns falsy, so `if (!auth)` never fires; `auth.sub` doesn't exist on the returned shape, so binds `undefined`. These endpoints are functionally broken today, not just insecure.

### 1.2 Assessment Engine
- Grading is correctly server-side for quizzes and knowledge checks (correct answers never sent to client pre-submission) — the right foundation.
- **`max_attempts` and `time_limit_minutes` are schema-only** — never enforced by any handler. Unlimited retakes, no timer.
- Quiz submission never checks enrollment on POST (only GET does) — a logged-in non-enrolled user can submit and get a scored attempt.
- Quiz answer insert omits the `answers` column despite it being `NOT NULL` in schema — no audit trail of what was actually submitted, likely a silent runtime issue.
- Knowledge checks allow infinite re-submission via upsert, meaning a wrong-then-right answer effectively "unlocks" the correct answer for free with no penalty.
- No anti-cheat: no shuffling, no rate limiting, no session/device tie, no partial credit weighting beyond raw percentage.

### 1.3 Certificates
- **Entirely schema-only / non-functional.** Two competing schemas exist (`certificates`/`academy_user_certificates` from migration 0003, dead; `academy_certificates` from migration 0007, the "real" one but only ever read, never written).
- No issuance trigger anywhere (course completion, cert-exam pass — `is_certification_exam` flag is defined and never read).
- No certificate-number generation algorithm, no public verification endpoint, no signing/hashing/tamper-resistance. This is a build-from-scratch feature, not a hardening task.

### 1.4 Referrals
- **Free-course fraud**: `enrollments/index.ts` computes referral commissions off a fake ₹1000 base price when a course is actually free (`price_inr > 0 ? price_inr : 1000`, labeled "for testing" in a comment) — meaning referral credits (real, spendable value) can be minted for zero cost, repeatably, with throwaway accounts.
- **No payment verification on enrollment at all** — `academy_payments` table is fully gateway-ready (Razorpay-shaped columns) but zero handler code references it. Enrollment is instant and free regardless of course price. This is the root cause that makes the referral economy exploitable — there's no real money anchoring the whole system yet.
- `referred_by` stores the referrer's *code* as a string, not a user-ID FK — no referential integrity, breaks if a code is ever regenerated.
- No self-referral / sockpuppet prevention, no CAPTCHA (a `turnstile_enabled` setting exists in `system_settings`, seeded `false`, never read by any code).
- SQL built via string interpolation in `tree.ts` (not exploitable today since codes are server-generated alphanumeric, but a real anti-pattern that becomes exploitable the moment vanity/custom codes are allowed) — also leaks `error.stack` to the client on failure.

### 1.5 Admin APIs
- The `hasPermission`/role system is well-designed (`admin_users.role` + `permissions` JSON array, `superadmin` bypass) but **only applied to the legacy marketing/CRM endpoints** (`audit`, `email`, `export`, `settings`, `users`).
- **Every Academy-specific admin endpoint added later skips it entirely**: `admin/academy/courses.ts`, `grading.ts`, `partners.ts`, `students.ts`, `certificates.ts` only check "is this any active admin," not role/permission. A lowest-privilege `viewer` admin account can create/edit/publish courses and change prices, grade assignments with no bounds-checking (`grade_score` unchecked against `max_score`), approve/reject partner applications (direct revenue-share impact), and **arbitrarily overwrite any student's `credit_balance` with no audit-log call** — the single most sensitive under-protected endpoint in the codebase.

### 1.6 Data Model
- Genuinely solid schema discipline in most of migrations 0003–0007 (FK cascades, most compound-unique constraints correct).
- Missing indexes on hot paths that will degrade at scale: `academy_quiz_attempts`, `academy_assignment_submissions` (assignment_id/user_id), `assessment_submissions` (zero secondary indexes), `admin_audit_log`/`email_audit` (no `created_at` index despite being sorted by it).
- Dead schema: `academy_credit_redemptions` (no API touches it — students can accumulate credit with no payout path), duplicate certificate tables, dead `locked_until`/`is_email_verified` columns.
- Missing tables entirely: `notifications` (frontend already has a `useNotifications` hook expecting one), `coupons`/`vouchers` (the payments table already has `coupon_code`/`discount_amount` columns with nothing behind them), `refresh_tokens` (durable, revocable sessions), `course_versions` (draft/publish separation), `email_verification_tokens`, generalized `webhook_events` (idempotency/replay protection — the one existing webhook, `tawkto.ts`, explicitly disables signature enforcement with a `// Temporary: do not return 401` comment).

### 1.7 Frontend / UX
- **Every Academy admin page (Course Manager, Grading Desk, Certificates Ledger, Partners, Students) is 100% hardcoded mock data with non-functional buttons** — "Create Course," "Edit," "Grade," "Approve," "Download Certificate" have no handlers at all. This is the single largest gap versus the "enterprise LMS" positioning: there is currently no real admin course-authoring tool in existence, anywhere in the code.
- None of these five admin pages use the already-built `DataTable` component (search, pagination, skeleton loading, empty states) — they reinvent a worse, static version each time.
- No data-fetching layer (no react-query/SWR) — raw `fetch`+`useState` duplicated per page, no caching, no optimistic UI, `alert()`/`window.confirm()` used for user feedback, several silent `.catch(console.error)` swallows.
- Course Player: primitive iframe/`<video>` embed, no resume-position persistence, binary lesson completion (no real watch-time gating), curriculum sidebar `hidden` below `lg` breakpoint with **no mobile fallback at all**, `dangerouslySetInnerHTML` for lesson content with no visible client-side sanitization step.
- Dashboard: "Certifications" and "Learning Time" stats are hardcoded to `0`/`"0h"` regardless of real data. Settings modal's password-change fields are uncontrolled with no submit handler; 2FA is a static placeholder image; SSO "Connect" buttons do nothing — **this presents nonexistent security features as if they exist**, which is a real reputational/trust risk beyond just "unfinished UI."
- Two disconnected design languages: the public Academy pages consistently use the good `rounded-control/card/feature`, `shadow-rest/raised/floating` tokens from `index.css`; the entire Admin subtree ignores them and uses raw ad hoc Tailwind (`rounded-2xl`, `bg-slate-900/50`, arbitrary `text-[10px]`) — visually, Academy and Admin look like two different products today.
- No error boundaries anywhere (a thrown error in any lazy-loaded route → blank white screen), no route-guard component (every page re-implements its own `if (!user) redirect` check), no schema validation (`zod`/`yup` absent, all API responses typed `any`), no form library, no testing framework of any kind, no i18n library despite a decorative 6-language selector already in the Settings UI.

### 1.8 Cross-Cutting
- CORS is `Access-Control-Allow-Origin: '*'` combined with `Access-Control-Allow-Credentials: 'true'` in the academy auth headers — a contradictory/misconfigured combination that should be locked to the real frontend origin.
- No rate limiting anywhere — including on a paid external Gemini API call (`assess.ts`), on registration, on password reset, or on any public form (`enquiry.ts`, `subscribe.ts`, `track.ts`).
- No pagination on most admin list endpoints or the public course list (will degrade with data growth; some other endpoints in the same codebase, like `admin/submissions.ts`, already do this correctly — it's inconsistency, not a missing capability).
- No error monitoring/observability (no Sentry, no RUM) on either frontend or Workers functions.

---

## 2. Target Architecture

### 2.1 Brand Alignment with Core SpotCLM
Pull directly from the parent SpotCLM `AI_HANDOFF.md` design philosophy rather than reinventing:
- Adopt the same **glassmorphism + dynamic gradient + custom keyframe** visual language already defined in the Academy's own `index.css` tokens (`--surface-*`, `--radius-control/card/feature`, `--shadow-rest/raised/floating`) — these are *already* on-brand; the fix is **enforcing** them everywhere (especially Admin), not creating new ones.
- Port `PremiumHero`, `BottomCTA`, and `HapticButton` patterns into Academy-specific contexts (course detail hero, enrollment CTA, milestone/certificate-unlock moments) so a user moving between spotclm.com and the Academy subdomain feels no seam.
- Standardize on Framer Motion (`motion`) for the same micro-interaction vocabulary (hover `-translate-y-2`, dynamic shadow/border transitions) already mandated for the main site.

### 2.2 New Frontend Foundations (prerequisites, not polish)
- **`@tanstack/react-query`** for all server state — replaces raw fetch+useState, gives caching, dedupe, background refetch, optimistic mutations.
- **`zod`** for API response/request schema validation, paired with inferred TypeScript types — removes the `any`-typed API surface.
- **`react-hook-form` + zod resolver** for every form (course builder, settings, checkout, auth) — replaces uncontrolled/ad hoc `useState`-per-field forms.
- **`@headlessui/react`** (already a dependency, unused) wired into every modal/dialog for focus-trapping, ESC-to-close, ARIA — replaces hand-rolled `<div>` overlays.
- A single `<ProtectedRoute>` / `<RequirePermission>` wrapper at the router level — replaces per-page duplicated auth checks.
- A top-level `<ErrorBoundary>` per route group (marketing / academy / admin) with a branded fallback screen.
- A `<Toast>`/notification-center component — replaces every `alert()`/`window.confirm()` call site.
- Design-token enforcement lint rule or at minimum a design-review pass forcing the Admin subtree onto the same `rounded-*`/`shadow-*` tokens as the public Academy.

### 2.3 Backend Foundations
- A shared `functions/api/utils/authz.ts` — one `requirePermission(admin, perm)` helper used uniformly, retiring the inconsistent per-file pattern (some check `hasPermission`, some check nothing, `users.ts` alone hardcodes `role === 'superadmin'`).
- A shared response/error wrapper (`ok()`, `fail(status, message)`) so stack traces never reach the client and status codes are consistent.
- A shared `zod`-validated request-parsing helper on the Workers side too, so both admin and academy handlers reject malformed bodies uniformly instead of ad hoc field checks.
- D1 migrations to consolidate/retire dead schema (drop the legacy `certificates`/`academy_user_certificates` pair once `academy_certificates` fully replaces it; wire or drop `academy_credit_redemptions`; add missing indexes).

---

## 3. Phased Roadmap

Sequencing follows the stakeholder's choice: **premium UI/UX workstream leads, security/correctness workstream runs in parallel** — except for a short list of items in **Phase 0** that are cheap, fast, and closing an active exploit or broken-endpoint bug; those ship immediately regardless of the UI timeline because they're effectively free and leaving them open costs nothing to fix now versus real risk later.

### Phase 0 — Immediate Fixes (days, not weeks; ships in parallel with everything else, first)
Cheap, surgical, no design/architecture dependency:
1. Fix broken auth checks in `referrals/credits.ts` / `referrals/tree.ts` (`auth.sub` → correct shape).
2. Add `Secure` flag to all auth cookies; lock CORS `Access-Control-Allow-Origin` to the real frontend origin (drop the wildcard+credentials combination).
3. Remove the client-side `localStorage` admin dev-bypass from the production bundle (gate behind a real build-time flag, not a runtime string check).
4. Re-enable Tawk.to webhook signature enforcement (remove the "do not return 401" bypass).
5. Strip `error.stack`/`error.message` from any client-facing error response.
6. Add `hasPermission` checks to the five unguarded Academy admin endpoints (`courses`, `grading`, `partners`, `students`, `certificates`) using the *existing* permission model — this alone closes the "any admin can rewrite credit balances" hole with minimal code.
7. Freeze the free-course referral-fraud path: gate commission calculation on `academy_payments` actually existing/verified (even as a stub check) rather than the fake ₹1000 fallback, until real payments land in Phase 3.

### Phase 1 — Premium UI/UX Foundation (primary focus, per stakeholder priority)
- Introduce react-query, zod, react-hook-form, error boundaries, `<ProtectedRoute>`, toast system (§2.2) — these are load-bearing for every feature phase after this, so they come first within the UI workstream itself.
- Unify design tokens across Admin + Academy; retire ad hoc Tailwind in the Admin subtree.
- Rebuild the Course Player: Cloudflare Stream integration for primary lesson video (resumable playback, watch-time events, signed playback URLs), sidebar drawer for mobile, skeleton loading between lesson navigations, sanitized rich-content rendering, keyboard shortcuts, optional theater/fullscreen mode.
- Rebuild the Dashboard: wire "Certifications"/"Learning Time" to real data, remove or properly implement the 2FA/SSO placeholders (implement real TOTP-based 2FA in Phase 6 rather than leaving a fake UI live), replace `alert()`-based feedback with the toast system.
- Mobile-responsive pass across Academy + Admin (the Course Player's missing mobile sidebar is the most severe instance, but the whole Admin subtree needs a responsiveness audit — it reads as desktop-only today).

### Phase 2 — Assessment Engine Rebuild
- Enforce `max_attempts` and `time_limit_minutes` server-side (both currently schema-only).
- Add enrollment check to quiz POST; persist `answers` correctly (fix the `NOT NULL` mismatch); populate `time_taken_seconds`.
- Introduce timed exam mode: server-issued deadline timestamp on quiz start, hard cutoff enforced on submission, auto-submit-on-expiry support from the client.
- Expand question types beyond MCQ: multi-select, true/false, ordering/matching, short-answer (auto-graded via exact/fuzzy match) — schema already has a `question_type` column, currently unused beyond `'mcq'`.
- Add per-question randomization (shuffle option order per attempt) and, optionally, a question bank with randomized subset selection for high-stakes certification exams.
- Rate-limit quiz submission per user/quiz to blunt trial-and-error gaming.

### Phase 3 — Admin Course Builder & Content Management (this is the "build from scratch" item)
- Real course/module/lesson CRUD UI wired to the existing `admin/academy/courses.ts` API (once permission-gated in Phase 0), replacing all five mock admin pages with functional versions built on the existing `DataTable` component.
- Rich content authoring: WYSIWYG/markdown editor for lesson content (replacing raw `dangerouslySetInnerHTML` trust with a proper editor + server-side sanitization pass, e.g. via a markdown pipeline that escapes/sanitizes on save, not just on render).
- Drag-and-drop module/lesson reordering.
- **Draft vs. published state** as a first-class concept: editing a "published" course should mutate a draft copy, with an explicit "Publish" action — closes the "live-edit of published content" gap identified in the audit. Requires a `course_versions`-style table or a `draft_json` column on `academy_courses`.
- Video upload flow directly into Cloudflare Stream from the admin course builder (upload → transcode → get playback ID), replacing manual YouTube-URL pasting for primary content.
- Grading Desk: real submission list + grading UI wired to `admin/academy/grading.ts`, with `grade_score` bounds validation against `max_score` added server-side.
- Partners/Students CRM: real approve/reject workflow wired to `partners.ts`/`students.ts`, with the credit-balance edit path requiring a reason/audit-log entry (`logAdminAction` call, currently missing) rather than a silent overwrite.

### Phase 4 — Certification & Verification Engine (net-new feature)
- Consolidate schema: drop the dead 0003 certificate tables, keep and extend `academy_certificates` as the single source of truth.
- Issuance trigger: automatic on course completion (100% lesson progress) AND/OR passing a quiz flagged `is_certification_exam` — both paths write to `academy_certificates`.
- **Credential ID scheme**: a human-shareable, collision-resistant certificate number (e.g., `SPOTCLM-{course-code}-{year}-{short-hash}`), stored alongside a cryptographic signature — HMAC-SHA256 over `{user_id, course_id, issued_at, certificate_number}` using a dedicated `CERT_SIGNING_SECRET`, or an asymmetric signature if third-party verification without shared-secret trust is desired.
- **Public verification endpoint**: `GET /api/certificates/verify/:certificateNumber` (no auth required) returning issued-to name, course title, issue date, revocation status, and a re-computed signature check — this is the actual "tamper-proof" deliverable the objective asks for.
- Optional QR code on the certificate PDF encoding the verification URL.
- Revocation support (`revoked_at` column already exists in schema) surfaced in both the admin ledger and the public verify page ("This certificate has been revoked").
- Certificate carries explicit SpotCLM platform tagging (logo, brand mark, verification URL) per the objective's requirement — this is a template/PDF-generation task (e.g., via an HTML-to-PDF render at issuance time) layered on top of the above.

### Phase 5 — Monetization: Payments, Vouchers, Referral Hardening
- **Payment integration (dual gateway)**: Razorpay for INR checkout, Stripe for USD/international, both writing to the existing `academy_payments` table (already gateway-shaped). Webhook handlers for both with real signature verification (following the pattern that should have been used for Tawk.to, not the disabled one currently in place). Enrollment becomes payment-gated: no `academy_enrollments` row without a verified `academy_payments` row for paid courses.
- **Voucher/coupon system** (net-new): a `coupons` table (code, discount type [percent/fixed], value, expiry, usage limit, per-user limit, applicable courses/categories) backing the currently-orphaned `academy_payments.coupon_code`/`discount_amount` columns. Validation logic server-side at checkout time (expiry, usage-limit, course-eligibility checks) — never trust a client-supplied discount amount.
- **Referral system hardening**: remove the fake ₹1000 fallback so free courses generate zero commission; tie commission calculation to the *actual verified payment amount*, not `price_inr`; add basic anti-abuse (Turnstile CAPTCHA on registration — the setting already exists and is inert, just needs wiring; rate-limit signups per IP; consider requiring email verification, using the already-present-but-dead `is_email_verified` column, before a referral is eligible to earn credit).
- **Redemption path**: build the missing API surface for `academy_credit_redemptions` (currently dead schema) so accumulated referral credit can actually be paid out or applied against future purchases — right now credits accumulate with no exit.

### Phase 6 — Holistic LMS Enhancements
- **Notifications**: `notifications` table + in-app notification center (the frontend already expects this via an existing `useNotifications` hook with no backend) — course updates, grading results, certificate issuance, referral credit events, partner approval status.
- **Learner dashboard analytics**: real progress-over-time, time-spent tracking (backed by Cloudflare Stream watch-time events from Phase 1), streaks/milestones — replacing today's hardcoded `0`/`"0h"` stats.
- **Session management**: durable `refresh_tokens` table (replacing KV-only storage) so users/admins can view and revoke active sessions; token invalidation on password change.
- **Real 2FA**: TOTP-based (e.g., via a library like `otpauth`), replacing the current fake placeholder UI in Settings — either ship it for real or remove the UI entirely; a decorative security feature is worse than none.
- **Rate limiting & bot protection**: Cloudflare Turnstile wired into registration/login/forgot-password/public forms; per-IP throttling (Workers-native rate limiting or a KV-based token bucket) on auth endpoints and the paid Gemini `assess.ts` call.
- **Pagination**: add `LIMIT`/`OFFSET` consistently across every admin list endpoint and the public course list (pattern already exists correctly in `admin/submissions.ts` — just needs to be applied everywhere else).
- **Observability**: Sentry (or equivalent) on both the frontend and Workers functions; audit-log coverage extended to every admin mutation, including the currently-silent `students.ts` credit-balance edit.
- **Testing**: introduce `vitest` + `@testing-library/react` for unit/component tests, Playwright for the critical e2e paths (enrollment → checkout → course completion → certificate issuance; admin course-create → publish → grade → certificate). Zero test coverage exists today — this should not be an afterthought given the money and credentials now flowing through the system.
- **i18n**: either wire the already-present 6-language Settings selector to a real i18n library (`react-i18next`), or remove the selector until it's real.

---

## 4. Data Model Changes Summary

**New tables:** `coupons`, `notifications`, `refresh_tokens`, `course_versions` (or a `draft_json` column on `academy_courses`), `email_verification_tokens`, `webhook_events` (generic idempotency/audit log for all inbound webhooks), `cert_signatures` (or fold signature into `academy_certificates` directly).

**Retire/consolidate:** legacy `certificates` + `academy_user_certificates` (superseded by `academy_certificates`), dead `locked_until` column (or actually wire it and drop the parallel KV lockout — pick one mechanism).

**Wire up existing-but-dead schema:** `academy_payments` (Phase 5), `academy_credit_redemptions` (Phase 5), `is_email_verified` (Phase 5/6).

**Add indexes:** `academy_quiz_attempts(user_id, quiz_id)`, `academy_assignment_submissions(assignment_id)` and `(user_id)`, `assessment_submissions(email)` and `(submitted_at)`, `admin_audit_log(created_at)`, `email_audit(created_at)`, `academy_users(partner_status)`, `academy_payments(status)`.

---

## 5. Suggested Delivery Order (condensed)

| Phase | Focus | Depends on |
|---|---|---|
| 0 | Fast security/correctness fixes | none — ships immediately, in parallel with everything |
| 1 | Frontend foundations + premium Course Player + Dashboard | none |
| 2 | Assessment engine rebuild (server-enforced timers/attempts, new question types) | Phase 1 data layer (react-query/zod) for the player-side UI |
| 3 | Admin course builder, real CRUD, draft/publish, Cloudflare Stream upload | Phase 1 foundations, Phase 0 permission fixes |
| 4 | Certification & public verification | Phase 3 (courses must be real before certs trigger meaningfully) |
| 5 | Payments (Razorpay+Stripe), vouchers, referral hardening | Phase 3 (real courses/pricing to sell) |
| 6 | Notifications, session mgmt, real 2FA, rate limiting, observability, testing, i18n | runs alongside 3–5, hardens the whole system before general launch |

---

## 6. Key Risks / Open Decisions to Revisit
- **Certificate signing scheme**: HMAC shared-secret (simpler, sufficient for a single-issuer platform) vs. asymmetric signing (lets third parties verify without ever trusting SpotCLM's live server) — recommend HMAC for v1, asymmetric as a v2 option if enterprise clients demand offline verification.
- **Cloudflare Stream cost/quota** should be validated against expected video-hours before Phase 3 commits to it as the exclusive video path for admin-uploaded content; the "use as convenient" flexibility means supplementary/low-stakes content can stay on lightweight embeds indefinitely.
- **Draft/publish implementation**: a full version-history table is more powerful but more work than a single `draft_json` snapshot column; recommend starting with the snapshot column and upgrading later only if version history/rollback is actually requested.
- **2FA**: decide now whether to build real TOTP 2FA in Phase 6 or remove the Settings UI section in Phase 1 — leaving it as fake in production for multiple phases is the one item flagged as a trust/reputational risk, not just an engineering gap.
