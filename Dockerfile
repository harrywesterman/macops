FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/data/macops.sqlite

RUN groupadd --system --gid 1001 macops \
  && useradd --system --uid 1001 --gid macops --home-dir /app macops

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate && npm cache clean --force

COPY --from=builder --chown=macops:macops /app/.next/standalone ./
COPY --from=builder --chown=macops:macops /app/.next/static ./.next/static
COPY --from=builder --chown=macops:macops /app/prisma ./prisma
COPY --from=builder --chown=macops:macops /app/scripts ./scripts
COPY --chown=macops:macops docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh \
  && mkdir -p /data \
  && chown -R macops:macops /data /app

USER macops
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["./docker-entrypoint.sh"]
