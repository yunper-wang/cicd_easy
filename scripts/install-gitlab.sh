#!/usr/bin/env bash
# install-gitlab.sh — Docker 部署 GitLab CE
# 为什么用 Docker 而非 SaaS: 模拟企业私有化场景，包含私有 Registry + Runner

set -euo pipefail

GITLAB_PORT="${GITLAB_PORT:-8929}"
GITLAB_SSH_PORT="${GITLAB_SSH_PORT:-2222}"
GITLAB_CONTAINER="${GITLAB_CONTAINER:-gitlab-ce}"

echo "[install-gitlab] 检查 GitLab 容器是否已存在..."
if docker ps -a --format '{{.Names}}' | grep -q "^${GITLAB_CONTAINER}$"; then
  echo "[install-gitlab] 容器 '${GITLAB_CONTAINER}' 已存在"
  if docker ps --format '{{.Names}}' | grep -q "^${GITLAB_CONTAINER}$"; then
    echo "[install-gitlab] 容器正在运行，跳过"
  else
    echo "[install-gitlab] 启动已有容器..."
    docker start "$GITLAB_CONTAINER"
  fi
  exit 0
fi

echo "[install-gitlab] 拉取 GitLab CE 镜像 (首次约 2GB，需等待)..."
docker pull gitlab/gitlab-ce:latest

echo "[install-gitlab] 启动 GitLab CE 容器..."
# 为什么限制内存 4G: GitLab 默认占用大量内存，限制防止宿主机 OOM
# 为什么用 host 网络: 简化 Kind 集群与 GitLab 之间的网络通信
docker run -d \
  --name "$GITLAB_CONTAINER" \
  --hostname gitlab.local \
  --memory 4g \
  --cpus 2 \
  -p "${GITLAB_PORT}:8929" \
  -p "${GITLAB_SSH_PORT}:22" \
  -e GITLAB_OMNIBUS_CONFIG="\
    external_url 'http://gitlab.local:${GITLAB_PORT}'; \
    gitlab_rails['gitlab_shell_ssh_port'] = ${GITLAB_SSH_PORT}; \
    registry_enable = true; \
    registry_external_url 'http://gitlab.local:5050'; \
    " \
  -v gitlab_config:/etc/gitlab \
  -v gitlab_logs:/var/log/gitlab \
  -v gitlab_data:/var/opt/gitlab \
  gitlab/gitlab-ce:latest

echo "[install-gitlab] 等待 GitLab 启动（首次约 5-10 分钟）..."
# 轮询检查 GitLab 是否就绪
MAX_WAIT=600  # 最多等 10 分钟
ELAPSED=0
while [[ $ELAPSED -lt $MAX_WAIT ]]; do
  if curl -sf "http://localhost:${GITLAB_PORT}/-/health" >/dev/null 2>&1; then
    echo "[install-gitlab] ✓ GitLab 已就绪"
    break
  fi
  sleep 10
  ELAPSED=$((ELAPSED + 10))
  echo "  等待中... (${ELAPSED}s/${MAX_WAIT}s)"
done

if [[ $ELAPSED -ge $MAX_WAIT ]]; then
  echo "[install-gitlab] ⚠ GitLab 启动超时，但容器仍在运行。请稍后手动检查。"
  echo "  检查命令: docker logs ${GITLAB_CONTAINER} --tail 20"
fi

# 获取初始 root 密码
echo ""
echo "[install-gitlab] 访问信息:"
echo "  URL: http://localhost:${GITLAB_PORT}"
echo "  用户名: root"
echo "  初始密码: docker exec -it ${GITLAB_CONTAINER} grep 'Password:' /etc/gitlab/initial_root_password"
echo ""
echo "[install-gitlab] 添加 hosts 映射 (如需要):"
echo "  echo '127.0.0.1 gitlab.local' | sudo tee -a /etc/hosts"
