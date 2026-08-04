# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

ARG NEXT_PUBLIC_WEBSITE_URL=
ENV NEXT_PUBLIC_WEBSITE_URL=$NEXT_PUBLIC_WEBSITE_URL

# Prisma schema references DATABASE_URL / DIRECT_URL; .env* are dockerignored.
# Placeholders satisfy `prisma generate` only — migrate runs at container start.
ENV DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/photoalbum"
ENV DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:5432/photoalbum"

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts/copy-ffmpeg-core.mjs ./scripts/copy-ffmpeg-core.mjs
RUN npm ci

COPY . .
# Skip `prisma migrate deploy` (needs a live DB); docker-entrypoint.sh runs it.
RUN npx prisma generate && npx next build
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl && addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
