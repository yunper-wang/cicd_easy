#!/usr/bin/env bash
# install-argo-rollouts.sh — 安装 Argo Rollouts Controller（Stage 3 Canary 需要）
# Argo Rollouts 是 Argo CD 的扩展，支持 Canary/Blue-Green 高级部署策略

set -euo pipefail

ARGO_ROLLOUTS_NS="${ARGO_ROLLOUTS_NS:-argo-rollouts}"

echo "[install-rollouts] 检查 Argo Rollouts 是否已安装..."
if kubectl get namespace "$ARGO_ROLLOUTS_NS" >/dev/null 2>&1; then
  if kubectl get pods -n "$ARGO_ROLLOUTS_NS" -l app.kubernetes.io/name=argo-rollouts >/dev/null 2>&1; then
    echo "[install-rollouts] Argo Rollouts 已安装，跳过"
    exit 0
  fi
fi

echo "[install-rollouts] 安装 Argo Rollouts Controller..."
kubectl create namespace "$ARGO_ROLLOUTS_NS" --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n "$ARGO_ROLLOUTS_NS" -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

echo "[install-rollouts] 等待 Controller 就绪..."
kubectl wait --for=condition=Available deployment/argo-rollouts -n "$ARGO_ROLLOUTS_NS" --timeout=120s

echo "[install-rollouts] 安装 Argo Rollouts Dashboard (可选 UI)..."
kubectl apply -n "$ARGO_ROLLOUTS_NS" -f https://github.com/argoproj/argo-rollouts/releases/latest/download/dashboard-install.yaml

echo "[install-rollouts] ✓ Argo Rollouts 安装完成"
echo ""
echo "  验证: kubectl get pods -n ${ARGO_ROLLOUTS_NS}"
echo "  Dashboard: kubectl port-forward svc/argo-rollouts-dashboard -n ${ARGO_ROLLOUTS_NS} 3100:3100"
