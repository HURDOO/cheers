FROM node:22-alpine@sha256:b6f26b36c8ff49624cfdac716b8ea1138d606df02586a77d364bb5536a634f85 AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:stable-alpine@sha256:ef8676b33d681f272ba429b27658bdd7e640963279714c96bddf1dc76307f7b6

COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY deploy/start-nginx.sh /usr/local/bin/start-nginx.sh
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

STOPSIGNAL SIGQUIT
ENTRYPOINT []
CMD ["sh", "/usr/local/bin/start-nginx.sh"]
