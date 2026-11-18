# LearnSteer Home (Astro + React + Supabase)

Converted from the single-file prototype to an **Astro** site with **React islands**, **Supabase** backend (content, contributors, roadmap, form submissions, media storage), and a **white + sky-blue** palette. Preserves the WebGL hero, scroll/reveal effects, roadmap, contributors teaser, full contributor graph view, admin, and join form.

## Stack
- Astro (static-first) + `@astrojs/react`
- React islands for hero/WebGL, roadmap, contributors teaser, contributor graph, join form, admin, and site effects
- Supabase: Postgres (content/tables) + Storage (`media` bucket) + Auth (admin)

## Setup
1. Install deps: `npm install`
2. Create a Supabase project and apply `supabase/schema.sql` (SQL editor). Optionally run `supabase/seed.sql`.
3. In Supabase Dashboard: create a **public** Storage bucket named `media` and add storage policies for public read / admin write (examples included in `schema.sql` comments). Upload hero media to `media/hero/` and contributor portraits to `media/contributors/`.
4. Copy `.env.example` to `.env` and set:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
5. (Optional) set hero video in `src/lib/content.ts` (`C.hero.src`, `C.hero.poster`) to a Supabase public URL or a local `/media/...` file.
6. Create an admin user in Supabase Auth and grant access: `insert into public.profiles (id,is_admin) values ('<auth-user-uuid>', true);`

## Dev / Build
- `npm run dev` (or `astro dev --background` per `AGENTS.md`)
- `npm run build` / `npm run preview`

## Views
- Home: `/`
- Contributors graph: `/#contributors` (or “View all contributors”)
- Admin: `/#admin` (sign-in + admin profile required)

## Performance notes
- Static sections ship minimal JS; interactive parts are hydrated as islands.
- Hero video: provide optimized MP4/WebM + poster, keep small; WebGL pauses off-screen and respects `prefers-reduced-motion`.
- Images: use optimized formats/sizes in `media` (WebP/AVIF where possible), lazy-loaded in UI.
- Contributor graph/admin mount on demand.

## Notes
- Without Supabase env vars, the site renders with bundled default content/placeholders and form/admin actions are limited.
- Tune WebGL/graph visuals in `src/components/sections/Hero.tsx` and `src/components/graph/ContributorsView.tsx`.
