FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
WORKDIR /app

COPY --from=server-deps /app/server ./server
COPY server/prisma ./server/prisma
COPY server/src ./server/src

COPY --from=frontend-builder /app/dist ./dist

RUN cd server && npx prisma generate

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3002
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server/src/index.js"]
