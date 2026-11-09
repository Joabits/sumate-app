FROM node:22-slim

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

# server/index.ts: Better Auth en /api/auth y la app de React con Vite (desarrollo).
# Para producción: `pnpm build` y luego `pnpm start`.
CMD ["pnpm", "dev"]
