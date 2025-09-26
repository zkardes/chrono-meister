# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files first for better caching
# Use explicit file names or copy to directory with trailing slash
COPY package.json package-lock.json ./

# Install dependencies using npm
RUN npm ci --silent

# Copy the rest of the source code (excluding large files via .dockerignore)
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
