# Use a Node.js lightweight Alpine image
FROM node:20-alpine

WORKDIR /app

# Instalar dependencias del sistema para Playwright (Chromium) y FFmpeg
RUN apk add --no-cache \
  chromium \
  ffmpeg \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont

# Variables de entorno para Playwright
ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install dependencies for overall workspace
COPY package.json package-lock.json ./
COPY apps/game-server ./apps/game-server/

# Install dependencies
RUN npm ci

# Set working directory to the game-server package
WORKDIR /app/apps/game-server
# Build step
RUN npx tsc

# Crear directorio para almacenamiento de grabaciones
RUN mkdir -p /data/replays

EXPOSE 2567 2568

# Volumen para persistir grabaciones entre reinicios del contenedor
VOLUME ["/data/replays"]

# Start the built server
CMD ["node", "dist/index.js"]
