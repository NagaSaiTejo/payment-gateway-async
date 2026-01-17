FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8000

# Add migration runner
COPY runMigrations.js .
COPY migrations/ ./migrations/

# Run migrations and start server
CMD ["sh", "-c", "node runMigrations.js && node src/app.js"]