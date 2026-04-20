# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
```

No test or lint commands are configured.

## Architecture

**Lumen** is an AI-powered Instagram content generation SaaS. Users define their brand once; the system generates, renders, and publishes daily posts automatically.

### Stack
- **Next.js 16** (App Router) — pages and API routes under `src/app/`
- **Supabase** — auth, PostgreSQL database, file storage (no ORM, raw `supabase.from()` queries)
- **Tailwind CSS v4** — styling
- **Fabric.js** — in-browser canvas editor for post design

### AI/External Services
| Service | Purpose | Client |
|---|---|---|
| Anthropic Claude | Generate image prompts | `src/lib/anthropic.ts` |
| OpenAI GPT | Generate captions & hashtags | `src/lib/openai.ts` |
| NanoBanana | AI image generation | `src/lib/nanobanana.ts` |
| Templated.io | Design template rendering | `src/lib/renderer.ts`, `render-engine.ts` |
| Instagram Graph API | OAuth + publish posts | `src/lib/instagram.ts` |

### Post Lifecycle
`generating → pending_review → approved → published`

The main generation pipeline is at `src/app/api/generate/pipeline/route.ts`. Cron jobs in `src/app/api/cron/` trigger daily generation (`generate-daily`) and token refresh (`refresh-tokens`) — configured in `vercel.json`.

### Database Schema (Supabase, RLS enabled)
- `profiles` — user data, subscription plan
- `brand_brains` — brand identity (tone, audience, posting strategy)
- `brand_assets` — uploaded logos/photos
- `instagram_connections` — OAuth tokens
- `posts` — generated posts with status tracking
- `templated_template_pool` — shared rendering slots (13 total), claimed atomically via `acquire_template_slot()` function

### Key Directories
- `src/app/(auth)/` — login/signup pages
- `src/app/dashboard/` — main app (overview, posts, statistics, brand-brain)
- `src/app/onboarding/` — 5-step brand setup wizard
- `src/app/admin/` — template management
- `src/app/api/` — all API routes
- `src/components/` — React components
- `src/lib/` — service integrations and utilities

### Supabase Clients
Use `src/lib/supabase/server.ts` in Server Components and API routes; use `src/lib/supabase/client.ts` in Client Components. Middleware for auth is in `src/lib/supabase/middleware.ts`.

### Environment Variables
Required in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `TEMPLATED_API_KEY`, `TEMPLATED_BASE_TEMPLATE_ID`, `NEXT_PUBLIC_TEMPLATED_EMBED_CONFIG_ID`, `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`.
