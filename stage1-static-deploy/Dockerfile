# Stage 1 Dockerfile —— Nginx 静态页面
# 为什么用 Nginx Alpine：轻量（~7MB），适合静态页面托管
FROM nginx:1.25-alpine

# 删除默认页面
RUN rm -rf /usr/share/nginx/html/*

# 复制静态页面到 Nginx 目录
COPY index.html /usr/share/nginx/html/index.html

# Nginx 默认监听 80 端口，EXPOSE 仅作文档说明
EXPOSE 80

# 使用 Nginx 前台运行模式
CMD ["nginx", "-g", "daemon off;"]
