# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache ffmpeg python3 py3-pip \
    && pip3 install --break-system-packages yt-dlp
COPY package*.json ./
RUN npm ci
COPY . .
# Skip build step - using JavaScript directly

# ---- run ----
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache ffmpeg python3 py3-pip curl \
    && pip3 install --break-system-packages yt-dlp

COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/src ./src

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://localhost:${PORT}/healthz || exit 1

USER node
CMD ["node","src/index.js"]
