# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npx ng build

# Static server, runs as the non-root `nginx` user (uid 101) on port 8080.
FROM nginxinc/nginx-unprivileged:1.27-alpine
ENV API_BASE_URL="" \
    GOOGLE_CLIENT_ID=""
COPY --from=build --chown=101:101 /app/dist/desertica-backoffice/browser /usr/share/nginx/html
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker/security-headers.conf.template /etc/nginx/templates/snippets/security-headers.conf.template
COPY --chmod=755 docker/15-api-origin.envsh /docker-entrypoint.d/15-api-origin.envsh
COPY --chmod=755 docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
