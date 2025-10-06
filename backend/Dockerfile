# Backend Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for MediaSoup
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconfig \
    pixman-dev \
    libx11-dev \
    libxext-dev \
    libxrender-dev \
    libxrandr-dev \
    libxfixes-dev \
    libxcomposite-dev \
    libxdamage-dev \
    libxkbcommon-dev \
    libdrm-dev \
    libgbm-dev \
    alsa-lib-dev \
    libatspi2.0-dev \
    libgtk-3-dev \
    libgdk-pixbuf2.0-dev \
    libcairo-gobject2 \
    libpango-1.0-dev \
    libatk-1.0-dev \
    libcairo-dev \
    libgirepository1.0-dev \
    libxss-dev \
    libasound2-dev

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mediasoup -u 1001

# Change ownership of app directory
RUN chown -R mediasoup:nodejs /app
USER mediasoup

# Expose ports
EXPOSE 3000 8080 40000-49999

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]
