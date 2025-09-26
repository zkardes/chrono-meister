# Stage 1: Build
FROM node:20-alpine AS build

# Install git and bun
RUN apk add --no-cache git
# Install bun
RUN npm install -g bun

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
# Copy bun lock file
COPY bun.lockb ./

# Install dependencies using bun
RUN bun install

# Copy the rest of the source code
COPY . .

# Build the application
RUN bun run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
