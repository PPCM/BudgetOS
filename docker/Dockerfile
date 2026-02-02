# Stage 1: Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json ./
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm pkg delete scripts.prepare && npm ci --omit=dev
COPY src/ ./src/
COPY knexfile.js ./
COPY --from=frontend /app/client/dist ./client/dist/
RUN mkdir -p data uploads logs

EXPOSE 3000

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DB_TYPE=sqlite \
    DB_PATH=./data/budgetos.db \
    COOKIE_SECURE=false

VOLUME ["/app/data", "/app/uploads", "/app/logs"]

CMD ["node", "src/server.js"]
