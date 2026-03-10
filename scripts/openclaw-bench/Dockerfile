FROM nikolaik/python-nodejs:python3.12-nodejs22

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
COPY public/openclaw ./public/openclaw
COPY scripts/openclaw-bench ./scripts/openclaw-bench

RUN npm install

CMD ["npm", "run", "test:openclaw:bench"]
