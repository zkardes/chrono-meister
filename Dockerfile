# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY bun.lockb ./

# Install dependencies
RUN bun install

# Copy the rest of the source code (excluding large files via .dockerignore)
COPY . .

# Build the application with Node.js memory limit
# The --max_old_space_size flag should be set as a Node.js option, not passed to Vite
ENV NODE_OPTIONS="--max_old_space_size=512"

# Build the application
RUN bun run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
