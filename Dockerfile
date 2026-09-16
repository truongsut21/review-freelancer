FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install production dependencies only (cached unless lockfile changes)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

# Run as the unprivileged user shipped with the node image
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-5000}/api/health" || exit 1

CMD ["node", "src/server.js"]
