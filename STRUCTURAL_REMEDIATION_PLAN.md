# SpotCLM Academy — Structural Remediation Plan

**Companion to:** `SPOTCLM_ACADEMY_MASTER_PLAN.md` (feature/security roadmap). This document addresses the separate complaint raised 2026-07-05: "severe structural misalignment... UI is highly disorganized... flow and architecture are fragmented and messy."
**Method:** Root-caused against the *current* codebase (which has grown substantially since the master plan — real checkout, coupons, notifications, refresh tokens, TOTP scaffolding, draft/publish versioning were added in the interim), not the earlier stale audit.

---

## 0. Account Correction (done this session)

- No "aroy" credentials/references existed in code or git — the association was purely `wrangler.toml`'s default bindings pointing at dev D1/KV resources living in `aroy86066@gmail.com`'s Cloudflare account.
- Created new D1 (`spotclm-academy-dev`, `2ab33547-d4ea-4452-9976-096d84182ab2`) and KV (`ENQUIRY_KV_DEV`, `52b8bbc987134538998f4bc0d8a96ac7`) under your account, applied all 16 migrations, verified schema-complete and seeded.
- `wrangler.toml` repointed; `[env.production]` was already correctly yours.
- **Outstanding, your action only:** if aroy retains Member/Collaborator access to your Cloudflare dashboard (not just his own account), revoke it yourself under Manage Account → Members — no available tool touches account membership.

---

## 1. Why It Feels Disorganized — Root Causes, Ranked

This is not a vague "needs polish" situation. Three of the eight causes below are concrete bugs or dead code, not aesthetic judgments.

### 1. Dead marketing-site barrel file (highest-impact ghost in the codebase)
`src/components/Pages.tsx:3-17` re-exports 13 page modules (`Home`, `Services`, `Implementation`, `Integrations`, `Support`, `Training`, `About`, `Pricing`, `FAQ`, `Contact`, `Blog`, `Careers`, `Legal`) — **none of these files exist**. The file is imported nowhere. `App.tsx` only ever routes `/` to the Academy home. This is the residue of an incomplete migration (marketing site → Academy-only) that was never finished being cleaned up, and it's the single biggest reason the codebase *reads* as fragmented to anyone browsing the file tree — a third of the apparent site doesn't exist.

### 2. A real runtime crash: `CourseBuilderPage` will break on every course save
`CourseBuilderPage.tsx:24,70,74,81` calls `addToast(...)` from `useNotifications()` — but that hook (`src/admin/hooks/useNotifications.ts:12-52`) only returns `{ notifications, unreadCount, addNotification, markRead, markAllRead, requestPermission, permissionGranted }`. There is no `addToast` method. **This throws in production the first time an admin saves/creates/errors on a course.** This is not a style issue — it's a P0 functional defect blocking the entire admin course-authoring workflow the master plan's Phase 3 depends on.

### 3. Three unreconciled auth-guard implementations
A generic, complete `ProtectedRoute` component already exists (`src/components/ProtectedRoute.tsx`, supports `requireAuth`/`requireAdmin`/`permission`) and **is used by nothing**. Instead: `AdminApp.tsx:63-68` has its own inline `Guard`; `Checkout.tsx:27-36` has its own inline `useEffect` redirect. Three different auth strategies for two auth domains means any future auth change (session timeout handling, redirect-with-return-url, role granularity) has to be hunted down and fixed three separate times, and already has drifted (Checkout's redirect logic is simpler/less robust than the others).

### 4. Convincing-looking UI that silently does nothing
- Notification bell (`AdminLayout.tsx:200-207`) — no `onClick`, no panel, count comes from a browser-only hook that never reads the real `academy_notifications` table (migration 0012 backend exists, frontend was never connected).
- "Apply" coupon button (`Checkout.tsx:247-249`) — no handler at all; a user typing a coupon code gets zero feedback before paying.
- "Enable 2FA" button (`Dashboard.tsx:624`) — no handler, no QR/TOTP flow, despite full TOTP server-side support (migration 0015).
This is the same "fake security/feature affordance" pattern flagged in the master plan (§1.7) — worse now because it's spread across three more surfaces. Users and admins clicking these get silent failures, which reads as "broken app," not "unfinished feature."

### 5. Inconsistent `DataTable` adoption (recurring, previously flagged, still happening)
9 admin pages correctly use the shared `DataTable` (search/pagination/skeleton/empty-state). `CourseManagerPage.tsx:54-116` — the newest page — reimplements a raw, unpaginated `<table>` from scratch instead. The pattern that was flagged as a problem in the original audit is repeating with each new admin page, meaning it's a process gap (no shared checklist/template for new admin pages), not a one-off oversight.

### 6. Three incompatible toast/feedback systems
`src/lib/toast.ts` (proper `sonner` wrapper, used correctly in `CoursePlayer`/`Dashboard`) vs. `Checkout.tsx` importing raw `sonner` directly, bypassing the wrapper, vs. `CourseBuilderPage`'s broken `addToast` call (see #2). No single source of truth for user-facing feedback.

### 7. Layout composition is a brittle string-match, not a routing concept
`App.tsx:101-103` decides header/footer visibility via `isPlayerPage` (substring check on the URL for `/course-player`/`/quiz-player`) and `isAdminPage` (`startsWith('/admin')`) rather than nested layout routes. Every new "distraction-free" page (e.g., Checkout arguably should hide the marketing footer too, but doesn't) requires manually extending this string condition or it silently inherits the wrong chrome.

### 8. React Query installed and wired, adopted by nobody
`QueryClientProvider` wraps the entire app (`main.tsx:6,19`) but no page found in the audit actually uses `@tanstack/react-query` — everything is still raw `fetch`+`useState` or the ad hoc `useD1Query` hook. This looks like a migration that was started (dependency installed, provider added) and abandoned mid-stream — dead infrastructure sitting next to the very ad hoc-fetch pattern it was presumably meant to replace.

---

## 2. Remediation Roadmap

### Phase A — Stop the Bleeding (ship this week, blocks nothing else)
1. **Fix the `addToast` crash** in `CourseBuilderPage.tsx` — either add an `addToast` method to `useNotifications()` or (simpler, since this is really "show a toast," not "manage notification state") switch these three call sites to the existing `src/lib/toast.ts` wrapper, matching every other page. This unblocks the entire course-authoring workflow.
2. **Delete `src/components/Pages.tsx`** and confirm nothing imports it (audit already confirmed nothing does). Removes the largest structural ghost immediately, zero risk.
3. **Disable or hide the three dead-end affordances** (notification bell, coupon Apply button, Enable 2FA button) until Phase C wires them for real — a `disabled` state or `title="Coming soon"` is a two-minute change that immediately stops the "silent failure" experience for real users. Do not leave convincing-but-fake UI live any longer than it takes to do this.

### Phase B — Architectural Consolidation (1-2 weeks)
4. **Adopt `ProtectedRoute` everywhere, delete the other two auth-gate implementations.** Replace `AdminApp.tsx`'s inline `Guard` and `Checkout.tsx`'s inline `useEffect` redirect with the existing component. This is a net deletion of code, not new code — the hard part (the component) is already built and just unused.
5. **Replace `isPlayerPage`/`isAdminPage` string-matching with real layout routes.** Restructure `App.tsx`'s `<Routes>` into layout-nested groups (e.g., a `<Route element={<MarketingLayout/>}>` wrapping public pages, `<Route element={<DistractionFreeLayout/>}>` wrapping player/quiz/checkout, admin already effectively separate via `AdminApp`). This is the standard React Router pattern (layout route + `<Outlet/>`) and removes an entire class of "forgot to add this path to the condition" bugs going forward.
6. **Unify on one toast system.** Replace the raw `sonner` import in `Checkout.tsx` with `src/lib/toast.ts`. After Phase A's fix, this leaves exactly one feedback pathway app-wide.
7. **Decide react-query's fate, don't leave it half-adopted.** Either commit to migrating the highest-traffic data-fetching call sites (Dashboard, CoursePlayer, admin list pages) onto it over the next few PRs — it's already provisioned, so the marginal cost per page is low — or remove the `QueryClientProvider` and the dependency if the team isn't going to use it. Leaving installed-but-unused infrastructure is itself a source of the "what pattern am I supposed to follow" confusion that likely produced causes #3, #5, and #6 in the first place.

### Phase C — Finish What Was Started (2-3 weeks, can run alongside Phase B)
8. **Course Manager**: rebuild on the shared `DataTable` component (search/pagination/skeleton/empty-state come for free) rather than the raw table currently in `CourseManagerPage.tsx`. Establish this as the mandatory template for any future admin list page — worth a one-paragraph note in a CONTRIBUTING/README so cause #5 stops recurring.
9. **Notifications**: build the missing admin/student notification panel wired to the real `academy_notifications` table (migration 0012) — the bell already exists visually, it just needs a real dropdown/page and a fetch instead of the browser-only stub.
10. **Coupons**: build the missing admin coupon-management page (create/list/deactivate codes against `academy_coupons`, migration 0011) and wire `Checkout.tsx`'s "Apply" button to a real validation call before payment, showing discount feedback inline rather than silently doing nothing until submit.
11. **2FA**: either build the real TOTP enrollment flow (QR code + verification, backed by migration 0015 — the hard backend part is already done) or remove the Settings UI section entirely until it's real. This is flagged in the master plan as a trust risk, not just a UX gap — don't let it linger through this phase.
12. **Checkout flow polish**: replace the `alert()`-based mock-payment confirmation with an in-app modal/toast consistent with the rest of the design system; make the currency toggle read a server-quoted price instead of a hardcoded `* 0.84` client-side conversion (the comment admitting "rough conversion for display" is a live pricing-mismatch risk); redirect to the course player (not the course detail page) immediately after a successful purchase to remove an unnecessary extra click in the core conversion path.

### Phase D — Process Guardrail (ongoing)
13. Add a short "new admin page checklist" (use `DataTable`, use `src/lib/toast.ts`, use `ProtectedRoute`, use the design tokens in `index.css`, wire to real data not a stub) to prevent the next new feature from reintroducing causes #3, #5, #6, #8. This costs almost nothing and is the actual fix for *why* these inconsistencies keep recurring rather than just fixing today's instances.

---

## 3. Suggested Sequencing

| Phase | Duration | Ships |
|---|---|---|
| A | days | Crash fix, dead-code removal, disable fake affordances |
| B | 1-2 weeks | Single auth-guard system, real layout routing, single toast system, react-query decision |
| C | 2-3 weeks | Course Manager on DataTable, real notifications, real coupons, real or removed 2FA, checkout polish |
| D | ongoing | Lightweight contribution checklist |

Phase A should ship immediately regardless of anything else — it's the difference between "an admin's course edits silently fail" and "they don't." Phases B and C can run in parallel once A is done; B is mostly deletion/consolidation of existing code, C is finishing genuinely unfinished features.
