FROM node:22-trixie-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci


FROM node:22-trixie-slim AS production-dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json','utf8')); delete p.devDependencies; fs.writeFileSync('package.json', JSON.stringify(p,null,2)+'\n')"
RUN npm ci --omit=peer


FROM node:22-trixie-slim AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Build-only values. Runtime credentials are provided by Portainer and are not
# baked into the image.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV BETTER_AUTH_SECRET=build-only-secret-not-used-at-runtime-1234567890
ENV BETTER_AUTH_URL=http://localhost:3000

RUN npx prisma generate
RUN npm run build
RUN rm -rf node_modules
COPY --from=production-dependencies /app/node_modules ./node_modules


FROM node:22-trixie-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app ./

RUN apt-get update \
    && apt-get install -y --no-install-recommends --only-upgrade \
       libssl3t64 \
       openssl-provider-legacy \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /usr/local/lib/node_modules/npm \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx

USER node

EXPOSE 3000

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && exec ./node_modules/.bin/next start"]
