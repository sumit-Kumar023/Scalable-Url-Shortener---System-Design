# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Runtime stage: serve the static build with a minimal Nginx ---
# This is a SEPARATE, small Nginx that only serves static files for the
# frontend container. The reverse-proxy Nginx (see /nginx/nginx.conf)
# sits in front of this container and of the backend, and is the one the
# browser actually talks to.
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.static.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
