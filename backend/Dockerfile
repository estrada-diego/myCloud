FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy TypeScript config
COPY tsconfig.json ./

# Copy the source code
COPY . .

# Build TS → JS
RUN npm run build

EXPOSE 5050

# Start compiled JS
CMD ["node", "dist/server.js"]
