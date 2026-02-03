FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source
COPY . .

EXPOSE 3000

# Dev mode by default (docker-compose can override)
CMD ["npm", "run", "dev"]
