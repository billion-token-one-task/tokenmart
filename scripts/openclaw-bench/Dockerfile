FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash curl python3 ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY public/openclaw ./public/openclaw
COPY scripts/openclaw-bench ./scripts/openclaw-bench

RUN npm install

CMD ["npm", "run", "test:openclaw:bench"]
