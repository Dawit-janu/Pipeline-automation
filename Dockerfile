FROM cypress/included:13.6.6

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# INI PALING PENTING
CMD ["npm", "run", "test"]
