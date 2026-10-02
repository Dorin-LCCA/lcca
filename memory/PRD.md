# VOYARA TRAVEL — Product Requirements Document

## Original Problem Statement
Build a complete, professional, modern, fully responsive website for a fictional digital travel agency "VOYARA TRAVEL" (tagline: "Discover more. Travel better.") for a university Digital Business & E-Marketing project. Must look like a real commercial travel company with a clear value proposition, customer journey, content strategy, lead-generation system, and analytics/CRM readiness.

## User Choices
- Auth: Real JWT email + password (httpOnly cookies)
- Lead forms: saved to DB + admin-viewable (CRM)
- Blog: DB-stored (CMS-style, seeded)
- Images: real travel photos (Unsplash/Pexels) matched per destination
- Analytics: built-in event tracking + admin analytics view

## Architecture
- **Frontend:** React 19 + React Router 7, Tailwind, shadcn/ui, sonner, lucide-react. Editorial travel-magazine aesthetic (Playfair Display + Plus Jakarta Sans + JetBrains Mono; cream/charcoal/dark-green/terracotta palette). Context: AuthContext, PlanTripContext. Analytics helper posts events to backend.
- **Backend:** FastAPI + Motor/MongoDB. JWT auth (bcrypt, access+refresh httpOnly cookies, brute-force lockout, admin seed). Collections: users, leads, blog_articles, analytics_events, login_attempts. All routes under `/api`.

## Personas
- Young professionals, students/grads, couples, friends, solo travellers, families — UK/London market seeking affordable-but-memorable, social-friendly trips.

## Customer Journey (implemented)
Awareness (hero/blog/social) → explore destinations/experiences → trust (why-choose, testimonials, FAQ, reviews) → lead capture (Plan My Trip modal, newsletter, contact enquiry) → account → dashboard.

## Implemented (2026-06, v1 MVP)
- Home: cinematic hero, trip planner search, popular destinations grid, "Travel your way" experiences, Why Choose VOYARA, featured offer, testimonials, newsletter/CRM, social gallery, final CTA.
- Destinations page (search + region/budget/trip-type/duration filters) + dynamic destination detail pages (8 destinations).
- Trips & Experiences page (6 curated experiences).
- Offers page (6 offers, tag filters, save-to-account).
- Blog "Travel Journal" (12 DB-seeded articles, category filter, article pages with related + CTA).
- About (story, mission, 4 values, how-it-works, team, reviews).
- Contact (full enquiry form + info + OpenStreetMap embed + FAQ accordion).
- Auth: Login, Signup (JWT), customer Dashboard (My Trips, Saved Destinations, Saved Offers, Preferences, Account).
- Admin CRM/Analytics dashboard (stat cards, events-by-type chart, recent activity, leads table) — admin-gated.
- SEO (per-page titles/meta/H1), accessibility (labels, focus states, semantic HTML), analytics event tracking across CTAs/forms/views, responsive + mobile hamburger.
- Legal pages (terms/privacy/cookies), 404.

## Iteration 2 (2026-06) — Rebrand + 3 features
- **Global rebrand VOYARA → DORIN TRAVEL**: every source file, public HTML title/meta, DB blog articles, admin/CRM, and seed data. Infra URLs left untouched. Tagline unchanged.
- **Google-only auth** (Emergent-managed OAuth): replaced JWT email/password entirely. `/api/auth/session` exchanges X-Session-ID → httpOnly `session_token` cookie (7d). Admin = ADMIN_EMAIL (spinudorin10@gmail.com), auto role on login. Frontend: loginWithGoogle redirect + AuthCallback hash handler; /login & /signup are one-tap Google screens.
- **Email automation** (Emergent Resend): welcome email on first login; enquiry/contact confirmation emails. Guardrail gate + server-side templates; from_name "DORIN TRAVEL". Verified 202 from proxy.
- **Blog editor** (admin CMS): full create/edit/delete in /admin "Blog editor" tab → `POST/PUT/DELETE /api/blog`, `GET /api/admin/blog`. New articles appear instantly on public /blog.

## Mocked / Simulated
- None. (Earlier simulated Google/forgot-password removed — Google OAuth is now real.)

## Notes
- Email proxy accepts real/`delivered@resend.dev` recipients; arbitrary throwaway test addresses return 422 (expected sandbox behavior), lead still saved.

## Backlog (P1/P2)
- P1: Wire Google OAuth (Emergent-managed) and real password-reset emails (Resend).
- P1: Connect analytics to Google Analytics 4 (window.gtag hook already present).
- P2: Validate saved item_id against known catalog; rate-limit /analytics/track.
- P2: Split server.py into routers (auth/leads/blog/analytics/dashboard) as it grows.
- P2: Admin ability to add/edit blog articles via UI (CMS front-end).

## Credentials
Admin: admin@voyaratravel.com / Voyara2026! — see /app/memory/test_credentials.md
