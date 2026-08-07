# AGENTS.md

## Cursor Cloud specific instructions

This repo is a Vite + React + TypeScript PWA (`futzueiro-app`) whose only backend is
Supabase. It is **online-first**: without a reachable Supabase the UI just renders a
"Supabase não configurado" empty state and no data can be created. For real end-to-end
work you need a running Supabase backend.

### Services

- **Web (Vite dev server)** — `npm run dev` (serves on http://localhost:5173). Standard
  scripts live in `package.json`: `npm run lint` (oxlint), `npm run build` (tsc + vite
  build), `npm run preview`.
- **Local Supabase stack** — the repo ships `supabase/config.toml` + `supabase/migrations`,
  so a full local stack (Postgres, PostgREST, Studio, etc.) runs via the Supabase CLI and
  Docker. API on http://127.0.0.1:54321, Studio on http://127.0.0.1:54323.

### Startup (Docker + Supabase CLI are preinstalled in the environment)

The update script only runs `npm install`. Docker and the Supabase CLI are installed at
the system level (captured in the VM snapshot) but their daemon/containers are NOT started
automatically. On a fresh session:

1. Start the Docker daemon if it is not already running (not managed by systemd here):
   `sudo dockerd` (run it in a background tmux session; it stays in the foreground).
   If needed, `sudo chmod 666 /var/run/docker.sock` so the `ubuntu` user can talk to Docker.
2. Start Supabase from the repo root: `supabase start` (first run pulls images; later runs
   are fast). Get credentials any time with `supabase status -o env`.
3. Ensure a `.env` exists at the repo root (it is gitignored). It must contain the local
   Supabase URL + anon key:
   - `VITE_SUPABASE_URL=http://127.0.0.1:54321`
   - `VITE_SUPABASE_ANON_KEY=<ANON_KEY from "supabase status -o env">`
   The anon key printed by the local CLI is the standard public demo key, not a real secret.
4. `npm run dev` and open http://localhost:5173.

### Non-obvious gotchas

- **`auto_expose_new_tables = true` is required in `supabase/config.toml`.** Modern local
  Supabase revokes Data API (`anon`/`authenticated`) table privileges by default. The app's
  migrations only set RLS policies (`using(true)`) and never `GRANT`, so without this toggle
  every request fails with `42501 permission denied for table players`. This flag is enabled
  in the repo; if it is ever removed, anon reads/writes break locally.
- Config changes (like the flag above) only apply to a **freshly initialised** database.
  This CLI build's `supabase db reset` fails with a `supabase-go` bootstrap error, so to
  re-apply migrations/grants use `supabase stop --no-backup` then `supabase start` instead.
- Vite loads env vars at startup; editing `.env` requires restarting `npm run dev`.
