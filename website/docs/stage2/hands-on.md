---
sidebar_position: 3
title: 实操引导
---

# Stage 2 实操引导

## 目标

掌握 Kustomize 多环境配置和 Argo CD 多 Application 管理，实现 dev -> staging -> prod 的渐进式部署。

## 前置条件

- Stage 1 已完成（Kind 集群、GitLab CI、Argo CD 正常运行）
- `kubectl` 和 `kustomize` 命令可用
- `argocd` CLI 已安装并登录

## Step 1: 创建 base 配置

首先创建所有环境共享的基础配置：

### base/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
commonLabels:
  app.kubernetes.io/part-of: stage2-multi-env
  app.kubernetes.io/managed-by: kustomize
```

### base/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stage2-app
spec:
  selector:
    matchLabels:
      app: stage2-app
  template:
    metadata:
      labels:
        app: stage2-app
    spec:
      containers:
      - name: app
        image: registry.local/stage2-app:latest
        ports:
        - containerPort: 80
```

### base/service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: stage2-app
spec:
  selector:
    app: stage2-app
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```

## Step 2: 创建 dev overlay

```yaml
# overlay/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: stage2-dev
patches:
  - target:
      kind: Deployment
    patch: |
      - op: replace
        path: /spec/replicas
        value: 1
      - op: replace
        path: /spec/template/spec/containers/0/image
        value: registry.local/stage2-app:dev-latest
```

验证 dev 配置：

```bash
kustomize build overlays/dev/
```

预期输出中应包含：
- `namespace: stage2-dev`
- `replicas: 1`
- `image: registry.local/stage2-app:dev-latest`
- `app.kubernetes.io/part-of: stage2-multi-env` 标签

## Step 3: 创建 staging overlay

```yaml
# overlay/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: stage2-staging
patches:
  - target:
      kind: Deployment
    patch: |
      - op: replace
        path: /spec/replicas
        value: 2
      - op: replace
        path: /spec/template/spec/containers/0/image
        value: registry.local/stage2-app:staging-latest
      - op: add
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

验证 staging 配置：

```bash
kustomize build overlays/staging/
```

## Step 4: 创建 prod overlay

```yaml
# overlay/prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: stage2-prod
patches:
  - target:
      kind: Deployment
    patch: |
      - op: replace
        path: /spec/replicas
        value: 3
      - op: replace
        path: /spec/template/spec/containers/0/image
        value: registry.local/stage2-app:v1.0.0
      - op: add
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 512Mi
```

验证 prod 配置：

```bash
kustomize build overlays/prod/
```

## Step 5: 直接部署到 dev 环境

使用 kubectl + kustomize 直接部署开发环境：

```bash
# 创建 namespace
kubectl create namespace stage2-dev --dry-run=client -o yaml | kubectl apply -f -

# 部署 dev 环境
kubectl apply -k overlays/dev/

# 验证
kubectl get pods -n stage2-dev
kubectl get deployment -n stage2-dev -o wide
```

## Step 6: 部署 staging 环境

```bash
kubectl create namespace stage2-staging --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -k overlays/staging/
kubectl get pods -n stage2-staging
```

## Step 7: 部署 prod 环境

```bash
kubectl create namespace stage2-prod --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -k overlays/prod/
kubectl get pods -n stage2-prod
```

## Step 8: 配置 Argo CD 多 Application

为每个环境创建独立的 Argo CD Application：

```bash
# dev — 自动同步
argocd app create stage2-dev \
  --repo https://your-gitlab.local/cicd_easy.git \
  --path labs/stage2-multi-env/overlay/dev \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace stage2-dev \
  --sync-policy automated \
  --auto-prune

# staging — 自动同步
argocd app create stage2-staging \
  --repo https://your-gitlab.local/cicd_easy.git \
  --path labs/stage2-multi-env/overlay/staging \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace stage2-staging \
  --sync-policy automated \
  --auto-prune

# prod — 手动同步（不设置 --sync-policy）
argocd app create stage2-prod \
  --repo https://your-gitlab.local/cicd_easy.git \
  --path labs/stage2-multi-env/overlay/prod \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace stage2-prod
```

## Step 9: 验证多环境部署

```bash
# 检查各环境 Pod
echo "=== dev ==="
kubectl get pods -n stage2-dev
echo "=== staging ==="
kubectl get pods -n stage2-staging
echo "=== prod ==="
kubectl get pods -n stage2-prod

# 对比 dev 和 prod 的 Deployment 差异
echo "=== dev deployment ==="
kubectl get deployment -n stage2-dev -o yaml | grep -E "replicas|image:|cpu:|memory:"
echo "=== prod deployment ==="
kubectl get deployment -n stage2-prod -o yaml | grep -E "replicas|image:|cpu:|memory:"

# 检查 Argo CD 所有 Application 状态
argocd app list
```

## Step 10: 触发渐进式部署

模拟一次完整的变更流程：

```bash
# 1. 修改 base 配置
echo "# Updated" >> labs/stage2-multi-env/base/deployment.yaml

# 2. 提交并推送
git add .
git commit -m "feat: update stage2 configuration"
git push origin main

# 3. 观察 dev 自动同步
argocd app get stage2-dev --watch

# 4. dev 验证通过后，staging 自动同步
argocd app get stage2-staging --watch

# 5. staging 验证通过后，手动同步 prod
argocd app sync stage2-prod
```

## 检查清单

- [ ] base/ 包含 deployment.yaml、service.yaml、kustomization.yaml
- [ ] 3 个 overlay 各自配置了正确的 replicas 和 image
- [ ] `kustomize build` 对每个环境输出正确的配置
- [ ] 3 个环境均已通过 kubectl 部署成功
- [ ] dev 环境 replicas=1，staging=2，prod=3
- [ ] Argo CD 显示 3 个 Application 正常同步
- [ ] dev/staging 使用 Auto Sync，prod 使用 Manual Sync
- [ ] 理解 base/overlay 合并机制和 patch 工作原理
