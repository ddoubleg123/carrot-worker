FROM node:20-alpine

# Install system dependencies including video processing tools
RUN apk add --no-cache \
    curl \
    python3 \
    py3-pip \
    ffmpeg \
    sudo

# Install yt-dlp via pip
RUN pip install --break-system-packages yt-dlp

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

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
