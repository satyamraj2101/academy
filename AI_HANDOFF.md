# SpotCLM - AI Handoff & Architecture Document

> **To any AI assistant reading this:** This document serves as the absolute source of truth for the SpotCLM architecture, deployment strategy, and codebase structure. Use this to orient yourself before making structural changes, deploying code, or modifying core systems.

---

## 1. Tech Stack Overview

### Frontend
- **Framework:** React 19 + React Router v7
- **Build Tool:** Vite (configured in `vite.config.ts`)
- **Styling:** Tailwind CSS v4 + native CSS variables (`index.css`). Heavy use of glassmorphism, dynamic gradients, and custom keyframe animations.
- **Icons & Animations:** `lucide-react` for icons, `framer-motion` (motion) for complex UI transitions.
- **SEO & Routing:** `react-helmet-async` for managing meta tags dynamically per route. Custom SSG/pre-rendering script (`scripts/prerender.mjs`) is used to generate static HTML for SEO indexing.

### Backend & Cloudflare Infrastructure
- **Hosting:** Cloudflare Pages (Direct Upload, detached from GitHub auto-deployments).
- **Database:** Cloudflare Workers KV (`ENQUIRY_KV`) is used to store contact form and proposal submissions.
- **Email Service:** Resend API (via Cloudflare Pages Functions) is used to dispatch email notifications on form submissions.

---

## 2. Deployment & Environments

The deployment pipeline is strictly manual via Wrangler CLI to enforce human intervention before code goes live. The project spans **two separate Cloudflare accounts**.

### Environments
1. **Development (Old CF Account):**
   - Deployed using `npm run deploy:dev`.
   - Uses the default KV namespace binding in `wrangler.toml`.
2. **Production (New CF Account - `spotclm.com`):**
   - Deployed using `npm run deploy:prod`.
   - Uses the `[env.production]` block in `wrangler.toml` with a distinct KV Namespace ID.
   
### Secrets & Variables
- `RESEND_API_KEY`: Must be stored securely via Cloudflare Dashboard under Pages -> Settings -> Variables and secrets (encrypted).
- `RESEND_TO_EMAIL`: Defined as a plaintext variable in `wrangler.toml` (`thunderbeast2204@gmail.com`).
- To deploy across accounts without browser OAuth friction, the developer utilizes `CLOUDFLARE_API_TOKEN` environment variables locally.

---

## 3. Codebase Structure

```text
├── src/
│   ├── components/
│   │   ├── Pages.tsx          # Contains major Service pages (Implementation, Integrations, Support, Training)
│   │   ├── Navigation.tsx     # Main navbar with mobile responsive sheet
│   │   ├── Footer.tsx         # Global footer
│   │   └── ...                # Other modular React components
│   ├── App.tsx                # Main router configuration and layout wrapper
│   ├── index.css              # Global styles, Tailwind directives, custom keyframes
│   └── main.tsx               # React DOM entry point
├── functions/                 # Cloudflare Pages Functions (Serverless endpoints)
│   ├── api/
│   │   └── submit.ts          # Endpoint handling form submissions (KV storage + Resend email)
├── scripts/
│   └── prerender.mjs          # Custom script to build static HTML for SEO
├── dist/                      # Compiled build output
├── wrangler.toml              # Cloudflare Pages & KV configuration
└── package.json               # Dependencies and custom deploy scripts
```

### Design Philosophy
- **Premium Enterprise Aesthetic:** The UI strictly adheres to a high-end, modern B2B SaaS look. 
- **Reusable Patterns:** Use the `PremiumHero` and `BottomCTA` components for any new service pages to maintain a unified layout.
- **Micro-interactions:** Buttons should use the `HapticButton` wrapper, and cards should have slight hover scale (`hover:-translate-y-2`) with dynamic shadow and border transitions.

---

## 4. Future Roadmap & Needed Enhancements

While the application is fully functional, the following improvements are recommended to elevate the system to enterprise-grade maturity:

### DevSecOps & Automation
- [ ] **GitHub Actions (CI/CD):** Implement a GitHub Action to automatically run `npm run lint` and `npm run build` on PRs to catch build errors before human deployment.
- [ ] **Staging Environment Link:** Automate deployment to a specific `staging.spotclm.com` subdomain on pushes to the `dev` branch.

### Security & Spam Prevention
- [ ] **Cloudflare Turnstile (CAPTCHA):** Integrate Cloudflare Turnstile into the contact and proposal modals to prevent automated bot spam in the `ENQUIRY_KV` database.
- [ ] **Rate Limiting:** Add a Cloudflare Page Rule or modify the `functions/api/submit.ts` to rate-limit form submissions by IP address.

### Backend & Analytics
- [ ] **Structured Database Migration:** If SpotCLM introduces user logins or complex relational data (e.g., user tracking, document storage), migrate away from Workers KV to Cloudflare D1 (SQL) or Supabase (PostgreSQL).
- [ ] **Web Analytics:** Integrate Cloudflare Web Analytics (privacy-first) or Google Analytics to track user conversion rates from the `BottomCTA` buttons.
- [ ] **Error Monitoring:** Add Sentry to the frontend and Cloudflare Functions to catch unhandled exceptions and routing errors.

### Code Quality
- [ ] **End-to-End Testing:** Introduce Playwright or Cypress to automate testing of the Proposal Modal submission flow, ensuring the API and UI never break silently.
- [ ] **Component Splitting:** `Pages.tsx` currently houses multiple massive components. Refactor this by breaking each page (Integrations, Support, etc.) into its own file inside a `src/pages/` directory for better maintainability.
