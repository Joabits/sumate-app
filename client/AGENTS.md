## Workflow

- Use pnpm: `pnpm-lock.yaml` is the committed lockfile.
- Scripts: `pnpm dev` (server + Vite with hot reload on :3000), `pnpm build` (Vite build to `dist/`), `pnpm start` (serves `dist/` + Better Auth), `pnpm typecheck`, `pnpm lint`, `pnpm email:dev`.
- E2E: `pnpm exec playwright test` with the app running on :3000 (see root README).

## Structure

- React + Vite + React Router. Entry: `index.html` → `src/main.tsx` (AuthProvider + BrowserRouter).
- `src/routers/`: `AppRoutes.tsx` (all routes), `PrivateRoute.tsx` (needs session → else `/auth/login`), `PublicRoute.tsx` (guests only → else `/explore`).
- Feature-based architecture. Each feature (`src/activities`, `src/participations`, `src/auth`) has `components/`, `context/` (`XContext.tsx`, `XProvider.tsx`, `xTypes.ts`), `hooks/` (`useX.ts`) and `pages/`.
- State is shared with React Context: `AuthProvider` wraps everything; `shared/components/AppProviders.tsx` wraps `ActivitiesProvider` + `ParticipationsProvider` for the signed-in routes; `ActivityDetailProvider` wraps the detail page. Components read with `useAuth`, `useActivities`, `useActivityDetail`, `useParticipations` and never import `src/api/*Actions` or `authClient` directly.
- Pages load their data in the browser with `shared/hooks/usePageData.ts`. Every successful action bumps `dataVersion` (ActivitiesProvider) and open pages reload.
- `src/api/`: all backend communication — `http.ts`, `*Api.ts` (HTTP calls), `*Actions.ts` (mutations used by the Providers), `*Queries.ts` (reads used by pages), `schemas/` (zod + mappers), `authApi.ts`/`authClient.ts` (Better Auth).
- `src/shared/`: UI used by several features (layout, header, buttons, dialogs, `Image`, `Link`). `src/components/ui/`: shadcn primitives. The `@/*` alias resolves from `src/`.
- `server/`: Node server. `/api/auth/*` → Better Auth (`server/auth.ts`, emails in `server/emails/`); everything else → the React app. It exists because Better Auth needs a server and Vite does not have one.

## Auth And Backend Integration

- Better Auth server config: `server/auth.ts`. Browser client: `src/api/authClient.ts`. FastAPI validates JWTs with `{FRONTEND_URL}/api/auth/jwks`.
- The browser calls FastAPI directly (`NEXT_PUBLIC_BACKEND_URL`), so the backend `CORS_ORIGINS` must include the frontend origin.
- `src/api/http.ts` sends a Better Auth JWT by default and retries one 401 after refresh. Set `withAuth: false` for public backend endpoints.
- Env vars keep the `NEXT_PUBLIC_` prefix (Vite exposes them via `envPrefix` in `vite.config.ts`); read them with `import.meta.env`.

## Environment

- Treat `.env.template` as the environment contract for PostgreSQL, Better Auth, external-backend, OAuth, JWT, and Brevo settings. `.env*` files are ignored except the template.
