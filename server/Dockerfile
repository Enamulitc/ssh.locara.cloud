FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN npm ci

COPY server server
RUN npm run prisma:generate -w server
RUN npm run build -w server

FROM node:22-alpine AS runtime
WORKDIR /app/server
ENV NODE_ENV=production
RUN apk add --no-cache openssl

RUN addgroup -S app && adduser -S app -G app

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/prisma ./prisma
COPY server/package.json ./package.json

RUN chown -R app:app /app
USER app
EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/app.js"]
