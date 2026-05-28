---
sidebar_position: 4
title: 实操引导
---

# Stage 1 实操引导

## 目标

完成 Git Push → CI Build → CD Sync 的完整 GitOps 闭环。

## 步骤

### 1. 部署 Stage 1 应用

```bash
cd cicd_easy

# 确保 Kind 集群运行中
kubectl cluster-info --context kind-cicd-cluster

# 部署 Stage 1 资源
kubectl apply -f labs/stage1-static-deploy/deployment.yaml
kubectl apply -f labs/stage1-static-deploy/service.yaml
```

### 2. 配置 Argo CD Application

```bash
# 通过 Argo CD CLI 创建应用
argocd app create stage1-app \
  --repo https://your-gitlab.local/cicd_easy.git \
  --path labs/stage1-static-deploy \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace stage1
```

### 3. 验证部署

```bash
# 检查 Pod 状态
kubectl get pods -n stage1

# 检查 Argo CD 同步状态
argocd app get stage1-app

# 访问应用
kubectl port-forward svc/stage1-app 8080:80 -n stage1
```

### 4. 触发 Pipeline

```bash
# 修改代码并推送
echo "Update $(date)" >> index.html
git add .
git commit -m "feat: 触发 Stage 1 Pipeline"
git push origin main
```

### 5. 观察流程

1. 在 GitLab Web UI 查看 Pipeline 运行状态
2. 在 Argo CD Dashboard 观察同步状态变化
3. 确认新版本已部署

## 检查清单

- [ ] Kind 集群运行正常
- [ ] Stage 1 应用已部署
- [ ] Argo CD Application 已创建且同步
- [ ] Pipeline 成功构建并推送镜像
- [ ] Argo CD 自动同步新版本
