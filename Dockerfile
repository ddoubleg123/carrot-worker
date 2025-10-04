FROM node:20-alpine

# Install system dependencies including video processing tools
RUN apk add --no-cache \
    curl \
    python3 \
    py3-pip \
    ffmpeg \
    sudo

# Create app directory and user first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install yt-dlp via pip as nodejs user
USER nodejs
RUN pip install --user --break-system-packages yt-dlp

# Switch back to root for remaining setup
USER root

# Add nodejs user to sudoers for runtime installations
RUN echo "nodejs ALL=(ALL) NOPASSWD: /sbin/apk" >> /etc/sudoers

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/healthz || exit 1

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "src/index.js"]
