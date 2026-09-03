# Use Node.js LTS (Iron)
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (only production for smaller image)
# We need prisma to run generate, so we install all, then prune later if needed
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy the rest of the application code
COPY src ./src/

# Ensure uploads directories exist
RUN mkdir -p uploads/products uploads/businesses uploads/categories

# Expose port
EXPOSE 5000

# Start server using standard node (PM2 could also be used here, but containers handle restarts)
CMD ["node", "src/server.js"]
