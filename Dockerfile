# ReformAI — imagem única (Next.js). Build com Bun; runtime em Node (o Next e o unpdf rodam em Node).
# Build:  docker build -t reformai .
# Migrar: docker run --rm --env-file .env reformai ./node_modules/.bin/prisma migrate deploy
# Rodar:  docker run -d --env-file .env -p 3000:3000 reformai

FROM node:22-bookworm-slim AS build
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json bun.lock ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# postinstall roda `prisma generate`
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
    && groupadd -r app && useradd -r -g app app
COPY --from=build --chown=app:app /app/package.json /app/next.config.ts /app/prisma.config.ts ./
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/.next ./.next
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/lib/generated ./lib/generated
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1
CMD ["./node_modules/.bin/next", "start"]
