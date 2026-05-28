---
sidebar_position: 3
title: Argo CD
---

# Argo CD

Argo CD 是 Kubernetes 原生的持续交付工具，实现 GitOps 工作流。

## 核心概念

- **Application** — Argo CD 管理的基本单元，关联 Git 路径和 K8s 集群
- **Sync** — 将 Git 中的期望状态应用到集群
- **Sync Policy** — 自动（Auto Sync）或手动触发同步
- **Health** — 应用健康状态评估

## Application 配置示例

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://gitlab.example.com/app.git
    targetRevision: main
    path: k8s/
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## 操作方式

| 操作 | 方式 |
|------|------|
| 查看应用状态 | Argo CD Dashboard / `argocd app get` |
| 手动同步 | Dashboard → Sync / `argocd app sync` |
| 查看差异 | Dashboard → App Details → Diff |
| 回滚 | Dashboard → History and Rollback |
