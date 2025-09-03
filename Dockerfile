FROM node:20-bookworm-slim

WORKDIR /app

# Minimal system dependencies (curl for runtime downloads, certs for HTTPS) + ffmpeg runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl ffmpeg \
 && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/healthz || exit 1

# Environment and port
ENV NODE_ENV=production
ENV PORT=8080
# Ensure pip --user installs are on PATH for the node user
ENV PATH="/home/node/.local/bin:${PATH}"
EXPOSE 8080

# Run as non-root user
USER node

# Start the application
CMD ["node", "src/index.js"]
