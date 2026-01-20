FROM cypress/base:18.16.0

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN mkdir -p /app/results

CMD ["npm", "run", "test"]
