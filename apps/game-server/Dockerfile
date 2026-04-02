# Use a Node.js lightweight Alpine image
FROM node:20-alpine

WORKDIR /app

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
