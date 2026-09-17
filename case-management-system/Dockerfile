# ============================================================
# CaseBench (Case Management System) - production image
# Serves the built React client AND the Express API from one container.
# ============================================================

# ---------- Stage 1: build the Vite client ----------
FROM node:20-bookworm-slim AS client-builder
WORKDIR /build/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
ARG VITE_API_URL=''
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# ---------- Stage 2: Express server + static client ----------
FROM node:20-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

# Build tools in case a native module (e.g. bcrypt) needs compiling.
# MONGOMS_SKIP_DOWNLOAD skips mongodb-memory-server's postinstall download.
ENV MONGOMS_SKIP_DOWNLOAD=true
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Install server dependencies first (better layer caching).
COPY server/package.json server/package-lock.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

# Copy server source, then the built client from stage 1.
COPY server/ ./server/
COPY --from=client-builder /build/client/dist ./client/dist

# Local document uploads land in server/uploads (served at /uploads).
RUN mkdir -p /app/server/uploads && chown -R node:node /app && mkdir -p /app/server/logs && chown -R node:node /app/server/logs

USER node
EXPOSE 5000
WORKDIR /app/server
CMD ["node", "src/index.js"]