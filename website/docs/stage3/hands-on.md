---
sidebar_position: 3
title: 实操引导
---

# Stage 3 实操引导

## 目标

完成 Canary 金丝雀发布的完整流程，理解渐进式交付和自动回滚。

## 步骤

### 1. 部署 Stage 3 Rollout

```bash
# 部署 Rollout 资源
kubectl apply -f labs/stage3-canary/rollout.yaml
kubectl apply -f labs/stage3-canary/service.yaml

# 部署 AnalysisTemplate
kubectl apply -f labs/stage3-canary/analysis-template.yaml
```

### 2. 配置 Argo CD Application

```bash
argocd app create stage3-app \
  --repo https://your-gitlab.local/cicd_easy.git \
  --path labs/stage3-canary \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace stage3
```

### 3. 触发 Canary 发布

```bash
# 修改镜像版本触发发布
kubectl patch rollout stage3-app -n stage3 \
  --type merge \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"app","image":"registry.local/stage3-app:v2.0.0"}]}}}}'

# 观察发布进度
kubectl argo rollouts get rollout stage3-app -n stage3 --watch
```

### 4. 手动控制发布

```bash
# 暂停发布
kubectl argo rollouts pause stage3-app -n stage3

# 继续发布
kubectl argo rollouts promote stage3-app -n stage3

# 中止发布（回滚）
kubectl argo rollouts abort stage3-app -n stage3
```

## 检查清单

- [ ] Rollout 资源创建成功
- [ ] Canary 发布按步骤执行（20%→40%→60%→80%→100%）
- [ ] AnalysisTemplate 在发布过程中执行分析
- [ ] 理解 promote 和 abort 命令的效果
- [ ] 在 Argo CD Dashboard 中观察到 Canary 进度
