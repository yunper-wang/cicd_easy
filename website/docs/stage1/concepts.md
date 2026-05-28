---
sidebar_position: 1
title: 核心概念
---

# Stage 1: GitOps 基本闭环

## 什么是 GitOps？

GitOps 是一种现代化的持续交付方法，其核心思想是 **将 Git 作为基础设施和应用配置的唯一可信源**。

### 四大原则

1. **声明式配置** — 整个系统的期望状态用声明式语言描述（如 YAML），而不是命令式脚本
2. **Git 单一可信源** — 系统的期望状态存储在 Git 中，所有变更通过 Git 提交
3. **自动同步** — 控制器持续比对 Git 中的期望状态与集群的实际状态，自动拉取变更
4. **持续协调** — 任何偏差都会被自动修正，确保系统始终处于期望状态

```mermaid
graph LR
    A[开发者] -->|git push| B[Git 仓库]
    B -->|watch| C[Argo CD]
    C -->|sync| D[Kubernetes 集群]
    D -->|status| C
```

## Stage 1 学习目标

在本阶段，你将理解并实践：

- Docker 镜像构建（Kaniko）
- GitLab CI Pipeline 配置（`.gitlab-ci.yml`）
- Argo CD Application 定义与同步
- Git Push → CI Build → CD Sync 完整闭环

下一步: [Pipeline 配置](./pipeline-config)
