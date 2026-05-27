#!/usr/bin/env bash
# install-argocd.sh — 在 Kind 集群中安装 Argo CD
# 为什么用 Helm 安装: 方便定制 Ingress 配置，后续升级也简单

set -euo pipefail

ARGOCD_NS="${ARGOCD_NS:-argocd}"
ARGOCD_VERSION="${ARGOCD_VERSION:-7.3.4}"  # Argo CD Helm chart 版本

echo "[install-argocd] 检查 Argo CD 是否已安装..."
if kubectl get namespace "$ARGOCD_NS" >/dev/null 2>&1; then
  if kubectl get pods -n "$ARGOCD_NS" -l app.kubernetes.io/name=argocd-server >/dev/null 2>&1; then
    echo "[install-argocd] Argo CD 已安装，跳过"
    exit 0
  fi
fi

echo "[install-argocd] 创建命名空间..."
kubectl create namespace "$ARGOCD_NS" --dry-run=client -o yaml | kubectl apply -f -

echo "[install-argocd] 添加 Argo CD Helm 仓库..."
helm repo add argo https://argoproj.github.io/argo-helm 2>/dev/null || true
helm repo update

echo "[install-argocd] 安装 Argo CD (chart version ${ARGOCD_VERSION})..."
# 为什么启用 Ingress: 方便通过浏览器访问 Argo CD Dashboard
# 为什么用 NodePort 而非 LoadBalancer: Kind 不支持 LoadBalancer
cat <<EOF | helm upgrade --install argocd argo/argo-cd \
  --namespace "$ARGOCD_NS" \
  --version "$ARGOCD_VERSION" \
  --values -
server:
  ingress:
    enabled: true
    annotations:
      kubernetes.io/ingress.class: nginx
      nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
      nginx.ingress.kubernetes.io/ssl-passthrough: "true"
      nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    hosts:
      - argocd.local
  # Service 类型改为 NodePort，方便 port-forward 访问
  service:
    type: NodePort
configs:
  # 允许不安全的仓库连接（本地 GitLab 使用自签证书）
  repositories:
    gitlab-local:
      type: git
      url: http://gitlab.local:8929
EOF

echo "[install-argocd] 等待 Argo CD Pod 就绪..."
kubectl wait --for=condition=Ready pods -l app.kubernetes.io/name=argocd-server -n "$ARGOCD_NS" --timeout=180s

echo "[install-argocd] ✓ Argo CD 安装完成"
echo ""
echo "访问方式:"
echo "  Port-Forward: kubectl port-forward svc/argocd-server -n ${ARGOCD_NS} 8080:443"
echo "  浏览器访问: https://localhost:8080"
echo "  用户名: admin"
echo "  密码: kubectl -n ${ARGOCD_NS} get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d"
echo ""
echo "  或使用 argocd CLI:"
echo "    argocd login localhost:8080 --username admin --password <password> --insecure"
