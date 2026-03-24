# --- Frontend build ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# --- API (Node.js + SQLite) ---
FROM node:20-alpine AS api
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY api/ ./api/
COPY scripts/serve-api.js ./scripts/serve-api.js
EXPOSE 3001
CMD ["node", "scripts/serve-api.js"]

# --- Frontend (nginx) ---
FROM nginx:alpine AS frontend
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
