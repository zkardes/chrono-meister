# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
RUN git clone https://github.com/zkardes/chrono-meister.git .
WORKDIR /app/frontend   # Pfad zu package.json
RUN npm install
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/frontend/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
