FROM node:22-slim

# socat reenvía localhost:8001 dentro del contenedor hacia el backend,
# así el render en servidor de Next usa la misma URL que el navegador.
RUN apt-get update && apt-get install -y --no-install-recommends socat \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "socat TCP-LISTEN:8001,fork,reuseaddr TCP:server:8000 & pnpm dev --hostname 0.0.0.0"]
