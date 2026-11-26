FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
RUN apk add --no-cache netcat-openbsd
WORKDIR /app

COPY --from=server-deps /app/server ./server
COPY server/prisma ./server/prisma
COPY server/src ./server/src

# server/src/shared/money.js re-exporta ../../../shared/money.js desde
# /app/server/src/shared, es decir /app/shared.
COPY shared ./shared

COPY --from=frontend-builder /app/dist ./dist

# Avisos legales: la MIT exige incluir el copyright en las copias distribuidas.
COPY LICENSE NOTICE.md ./

RUN cd server && npx prisma generate

COPY server/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3002
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server/src/index.js"]
