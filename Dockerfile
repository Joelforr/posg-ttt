# syntax=docker/dockerfile:1

# ---------- Build stage ----------
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@11.13.1 --activate
WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/engine/package.json ./packages/engine/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages ./packages

# Build the client bundle → packages/client/dist
RUN pnpm --filter @posg-ttt/client build

# ---------- Runtime stage ----------
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Copy everything from builder — image stays under 200 MB, and we keep
# tsx around because the server runs from source.
COPY --from=builder /app ./

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["pnpm", "--filter", "@posg-ttt/server", "start"]