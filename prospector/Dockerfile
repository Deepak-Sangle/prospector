# Prospector runs TypeScript natively via Node's type stripping (Node >= 23.6),
# so there is no build/compile step — we ship the .ts sources and run `node app.ts`.
FROM node:24-slim

# openssl + ca-certificates: Prisma engines and outbound TLS (Slack, AI, DB).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

# Install deps first for layer caching. `npm ci` runs postinstall
# (`prisma generate` -> db/generated), so the schema must be present.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# App sources (node_modules and db/generated are excluded via .dockerignore;
# generated client was produced by the postinstall step above).
COPY . .

EXPOSE 3000
CMD ["node", "app.ts"]
