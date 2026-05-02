# FreshKeep backend — production image.
# Multi-stage to keep the runtime small (no devDependencies, no source maps).

# ─── Build stage ───
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
# `omit=optional` skips firebase-admin unless explicitly enabled — keeps the
# image small for users who don't push notifications. To include it for
# production, build with: docker build --build-arg WITH_FCM=1 .
ARG WITH_FCM=0
RUN if [ "$WITH_FCM" = "1" ]; then \
      npm ci --omit=dev; \
    else \
      npm ci --omit=dev --omit=optional; \
    fi

COPY src ./src

# ─── Runtime stage ───
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY package.json ./

EXPOSE 3000
# Run migrations on container start so a fresh deploy has the right schema.
# Idempotent — schema_migrations tracks what's applied.
CMD ["sh", "-c", "node src/db/migrate.js && node src/server.js"]
