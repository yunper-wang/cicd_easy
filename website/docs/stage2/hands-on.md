---
sidebar_position: 3
title: 实操引导
---

# Stage 2 实操引导

## 目标

掌握 Kustomize 多环境配置和 Argo CD 多 Application 管理。

## 步骤

### 1. 部署多环境 Stage 2

```bash
# dev 环境
kubectl apply -k labs/stage2-multi-env/overlay/dev/

# staging 环境
kubectl apply -k labs/stage2-multi-env/overlay/staging/

# prod 环境
kubectl apply -k labs/stage2-multi-env/overlay/prod/
```

### 2. 配置 Argo CD 多 Application

```bash
# dev 应用
argocd app create stage2-dev \
  --repo https://your-gitlab.local/cicd_easy.git \
  --path labs/stage2-multi-env/overlay/dev \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace stage2-dev \
  --sync-policy automated

# prod 应用（手动同步）
argocd app create stage2-prod \
  --repo https://your-gitlab.local/cicd_easy.git \
  --path labs/stage2-multi-env/overlay/prod \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace stage2-prod
```

### 3. 验证多环境部署

```bash
# 检查各环境 Pod
kubectl get pods -n stage2-dev
kubectl get pods -n stage2-prod

# 比较环境差异
kubectl get deployment -n stage2-dev -o yaml
kubectl get deployment -n stage2-prod -o yaml
```

## 检查清单

- [ ] 3 个环境均已部署
- [ ] dev 环境 replicas=1，prod 环境 replicas=3
- [ ] Argo CD 显示所有 Application 正常同步
- [ ] 理解自动同步 vs 手动同步的差异
