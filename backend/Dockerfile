# Stage 1: Build - install all deps and generate Prisma client
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
# Install all dependencies (including dev for prisma generate)
RUN npm ci

COPY . .

# Generate Prisma Client typings
RUN npx prisma generate

# Stage 2: Production - lightweight image with only production dependencies
FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
# Install only production dependencies
RUN npm ci --omit=dev

# Copy generated Prisma client from builder
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /usr/src/app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy application files
COPY . .

# Set up entrypoint script
RUN chmod +x docker-entrypoint.sh

# Expose backend REST port
EXPOSE 5000

# Execute server startup command through entrypoint
CMD ["./docker-entrypoint.sh"]
