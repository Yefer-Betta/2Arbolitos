FROM node:22-alpine
RUN apk add --no-cache openssl ca-certificates
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

USER node
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('net').connect(3002, 'localhost').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" || exit 1

CMD ["node", "src/index.js"]
