# Use a Node.js lightweight Alpine image
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for overall workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Install pnpm 
RUN npm install -g pnpm

# Copy only the game-server package
COPY apps/game-server ./apps/game-server/

# Install dependencies
RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/game-server
# Build step if using TypeScript outputs (ts-node-dev is used locally).
# Since currently it's invoked via ts-node, we'll install typescript globally or just run through ts-node in prod (or better compile to JS).
RUN pnpm exec tsc

# Production stage
FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/apps/game-server/dist ./dist
COPY --from=builder /app/apps/game-server/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 2567

CMD ["node", "dist/index.js"]
