# Stage 2 Dockerfile —— 多环境版本展示
FROM nginx:1.25-alpine

RUN rm -rf /usr/share/nginx/html/*

COPY index.html /usr/share/nginx/html/index.html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
