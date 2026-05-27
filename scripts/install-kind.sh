#!/usr/bin/env bash
# install-kind.sh — 创建 Kind Kubernetes 集群
# Kind = Kubernetes in Docker，本地轻量级 K8s 集群

set -euo pipefail

CLUSTER_NAME="${KIND_CLUSTER_NAME:-cicd-easy}"
K8S_VERSION="${KIND_K8S_VERSION:-v1.29.2}"

echo "[install-kind] 检查 kind 是否已安装..."
if ! command -v kind >/dev/null 2>&1; then
  echo "[install-kind] 安装 kind..."
  # Linux / macOS / WSL2
  curl -sLo ./kind https://kind.sigs.k8s.io/dl/latest/kind-linux-amd64
  chmod +x ./kind
  sudo mv ./kind /usr/local/bin/kind
fi
echo "[install-kind] kind 版本: $(kind version)"

# 检查集群是否已存在
if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
  echo "[install-kind] 集群 '${CLUSTER_NAME}' 已存在，跳过创建"
  exit 0
fi

# 创建 Kind 配置文件
# 为什么用 2 个 worker: 模拟多节点场景，Argo CD 和应用分布在不同节点
KIND_CONFIG=$(cat <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
name: ${CLUSTER_NAME}
nodes:
  - role: control-plane
    # 映射端口到宿主机，方便访问 Ingress
    extraPortMappings:
      - containerPort: 80
        hostPort: 80
        protocol: TCP
      - containerPort: 443
        hostPort: 443
        protocol: TCP
  - role: worker
  - role: worker
networking:
  # 使用固定 CIDR，方便后续 GitLab 容器网络互联
  podSubnet: "10.244.0.0/16"
  serviceSubnet: "10.96.0.0/12"
EOF
)

echo "[install-kind] 创建集群 '${CLUSTER_NAME}' (K8s ${K8S_VERSION})..."
echo "$KIND_CONFIG" | kind create cluster --image "kindest/node:${K8S_VERSION}" --config -

# 验证
echo "[install-kind] 等待节点就绪..."
kubectl wait --for=condition=Ready nodes --all --timeout=120s

echo "[install-kind] 安装 NGINX Ingress Controller（Argo CD Ingress + Stage 3 Canary 需要）..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=120s

echo "[install-kind] ✓ Kind 集群创建完成"
echo "  验证: kubectl get nodes"
