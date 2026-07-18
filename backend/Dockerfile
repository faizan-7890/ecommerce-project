# Use official Node.js runtime as a parent image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install project dependencies
RUN npm install --only=production

# Copy application files
COPY . .

# Generate Prisma Client typings
RUN npx prisma generate

# Expose backend REST port
EXPOSE 5000

# Execute server startup command
CMD ["npm", "start"]
