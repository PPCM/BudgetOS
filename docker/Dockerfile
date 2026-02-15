# Stage 1: Build frontend
FROM node:24-alpine AS frontend
WORKDIR /app
COPY package.json ./
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Production
FROM node:24-alpine

ARG VERSION=1.0.0
ARG BUILD_DATE
ARG VCS_REF

LABEL org.opencontainers.image.title="BudgetOS" \
      org.opencontainers.image.description="Self-hosted personal finance management application" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.url="https://github.com/PPCM/BudgetOS" \
      org.opencontainers.image.source="https://github.com/PPCM/BudgetOS" \
      org.opencontainers.image.documentation="https://github.com/PPCM/BudgetOS#readme" \
      org.opencontainers.image.licenses="PolyForm-Noncommercial-1.0.0" \
      org.opencontainers.image.vendor="PPCM"

WORKDIR /app
COPY package*.json ./
RUN npm pkg delete scripts.prepare && npm ci --omit=dev
COPY src/ ./src/
COPY knexfile.js ./
COPY --from=frontend /app/client/dist ./client/dist/
RUN mkdir -p data uploads logs client/public/uploads/payees && \
    chown -R node:node data uploads logs client/public/uploads

USER node

EXPOSE 3000

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DB_TYPE=sqlite \
    DB_PATH=./data/budgetos.db \
    COOKIE_SECURE=false

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/health || exit 1

VOLUME ["/app/data", "/app/uploads", "/app/logs"]

CMD ["node", "src/server.js"]
