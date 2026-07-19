# SpotCLM - Future Roadmap & Enhancements

This document outlines the strategic roadmap for the SpotCLM web application. While the current MVP is highly performant, visually premium, and fully deployed, these enhancements will elevate the system to an enterprise-grade standard.

---

## Phase 1: Security & Spam Mitigation (High Priority)
Currently, the contact forms and proposal modals submit directly to the Cloudflare API and KV database. Without protection, this is vulnerable to automated bot spam.

- [ ] **Implement Cloudflare Turnstile:** Add Cloudflare’s invisible Turnstile (a frictionless alternative to Google reCAPTCHA) to the `onOpenProposalModal` and contact form flows.
- [ ] **API Rate Limiting:** Configure Cloudflare WAF (Web Application Firewall) rate limiting for the `/api/submit` endpoint (e.g., maximum 5 requests per minute per IP).
- [ ] **Payload Validation Enhancement:** Add a strict validation library (like `Zod`) inside the Cloudflare Pages Function (`functions/api/submit.ts`) to reject malformed requests before processing them.

---

## Phase 2: Frontend Architecture & Refactoring
As the application grows, maintaining a massive single file for all pages becomes difficult.

- [ ] **Component Splitting:** Refactor `src/components/Pages.tsx` (which is currently over 4,000 lines). Break each major component (`IntegrationsComponent`, `SupportComponent`, `CorporateTrainingComponent`) into its own dedicated file under a new `src/pages/` directory.
- [ ] **Atomic Design Implementation:** Move the `PremiumHero`, `BottomCTA`, and `HapticButton` into a `src/components/ui/` directory.
- [ ] **Lazy Loading:** Use React’s `lazy()` and `Suspense` for loading route components to reduce the initial JavaScript bundle size, further improving load speeds.
- [ ] **Performance Optimization:** Defer the loading of heavy CSS keyframe animations (like the Integrations Orbit diagram) until they actually scroll into the user's viewport using `IntersectionObserver`.

---

## Phase 3: DevSecOps & Automation
You have successfully implemented a manual "Dev to Prod" deployment strategy. Now, the testing surrounding that strategy should be automated.

- [ ] **GitHub Actions (CI/CD):** 
  - Create a `.github/workflows/main.yml` file.
  - Automate a `build` and `lint` check every time a Pull Request is opened.
  - **Do NOT** automate the production deployment (to maintain human intervention), but automate the deployment to a unique preview link for every PR.
- [ ] **Git Hooks:** Install `husky` and `lint-staged` to enforce code formatting (Prettier) and linting (ESLint) locally before a developer is allowed to commit.

---

## Phase 4: Database Evolution & Backend
Cloudflare Workers KV is a key-value store, which is fantastic for simple storage, but not ideal for complex data relationships.

- [ ] **Migrate to Cloudflare D1 (SQL Database):** If SpotCLM begins to offer user portals or needs to track complex relational data (e.g., mapping a specific enterprise client to multiple ongoing support tickets), migrate the enquiry data from Workers KV to Cloudflare D1.
- [ ] **Automated Follow-ups:** Enhance the `submit.ts` Resend integration to automatically trigger a beautifully formatted HTML "Welcome/Thank You" drip email to the user who submitted the form, not just an alert to the admins.

---

## Phase 5: Testing & QA Quality Assurance
Currently, the application relies on manual testing.

- [ ] **End-to-End (E2E) Testing:** Introduce `Playwright` or `Cypress`. Write automated scripts that simulate a user clicking through the pricing cards, opening the proposal modal, filling out data, and submitting it to ensure the core business flow never breaks.
- [ ] **Unit Testing:** Introduce `Vitest` for testing utility functions (like price calculations, animation triggers, and state management).

---

## Phase 6: SEO & Analytics Expansion
- [ ] **Automated Sitemap Generation:** Create a script that dynamically generates an `sitemap.xml` based on the React Router configurations during the `npm run build` process.
- [ ] **Privacy-First Analytics:** Integrate Cloudflare Web Analytics or Plausible Analytics. These tools do not use cookies (avoiding annoying cookie consent banners) while still tracking exactly which services users are viewing most often.
- [ ] **Dynamic Open Graph (OG) Images:** Currently, a static OG image is used for social sharing. Implement a Worker to generate dynamic social sharing images based on the specific page the user is sharing (e.g., a specific training tier).
