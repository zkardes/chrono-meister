# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy only package files first
COPY package*.json ./
COPY package-lock.json ./

# Install dependencies with memory optimization
RUN npm ci --silent --no-audit --no-fund --prefer-offline

# Copy only necessary files for build
COPY src/ ./src/
COPY public/ ./public/
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY index.html ./

# Build with memory optimization
RUN npm run build -- --max_old_space_size=512

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
