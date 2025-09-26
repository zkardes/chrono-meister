# Stage 1: Build
FROM node:20-alpine AS build

# Install git (needed for some npm packages)
RUN apk add --no-cache git

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
# Use the correct lock file (package-lock.json instead of bun.lockb)
COPY package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
