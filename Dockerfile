# Use Node.js 18 as base image
FROM node:18-slim

# Install system dependencies for FFmpeg and yt-dlp
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    fonts-dejavu-core \
    fonts-dejavu-extra \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp using --break-system-packages flag for Debian 12
RUN pip3 install --break-system-packages --upgrade yt-dlp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads temp output public

# Expose port (Cloud Run will set PORT environment variable)
EXPOSE 8080

# Set environment variable for production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]