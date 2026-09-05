# LeadTrack

LeadTrack is a single-page React/Vite enquiry tracker backed by Supabase PostgreSQL.

## Local setup

1. Run `npm install`.
2. Open `.env.local`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the public values from your Supabase project.
4. Run `supabase/schema.sql` in the Supabase SQL editor.
5. Run `npm run dev`.

The app uses only the public Supabase anon key in the browser. Never add a service-role key to `.env`, source code, or Vercel client variables.

## Production build

Run `npm run build` and deploy the generated `dist` directory with Vercel. Add the same two `VITE_` variables to the Vercel project environment.