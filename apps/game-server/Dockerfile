# Debian slim — compatible con binarios bundled de Playwright (glibc)
FROM node:24-slim

WORKDIR /app

# Instalar dependencias del sistema para FFmpeg y Playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
  ffmpeg \
  && rm -rf /var/lib/apt/lists/*

# Instalar Playwright con Chromium y ffmpeg bundled (incluye deps del sistema)
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install dependencies for overall workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/game-server ./apps/game-server/

# Install dependencies
RUN corepack enable && pnpm install --frozen-lockfile --filter game-server...

# Instalar Chromium + ffmpeg de Playwright con sus dependencias de sistema
RUN pnpm --filter game-server exec playwright install --with-deps chromium && pnpm --filter game-server exec playwright install ffmpeg

# Set working directory to the game-server package
WORKDIR /app/apps/game-server
# Build step
RUN pnpm exec tsc

# Crear directorio para almacenamiento de grabaciones
RUN mkdir -p /data/replays

EXPOSE 2567 2568

# Volumen para persistir grabaciones entre reinicios del contenedor
VOLUME ["/data/replays"]

# Start the built server
CMD ["node", "dist/index.js"]
