FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install app dependencies - copy from root context
COPY package.json package-lock.json* ./

RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --production; fi

# Copy backend directory
COPY backend/ ./backend/

# Copy frontend directory for static file serving
COPY frontend/ ./frontend/

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]