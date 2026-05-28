---
sidebar_position: 1
title: Stage 3 实操
---

# Stage 3: Canary 发布实操

本目录包含 Stage 3 的完整实操资源文件。

## 文件清单

```
labs/stage3-canary/
├── rollout.yaml             # Argo Rollouts 配置
├── service.yaml             # Kubernetes Service 配置
├── analysis-template.yaml   # 分析模板
├── .gitlab-ci.yml           # GitLab CI Pipeline 配置
├── Dockerfile               # 应用镜像构建文件
└── index.html               # 示例应用页面
```

## 开始练习

1. 阅读 [Stage 3 概念](../../stage3/concepts) 了解金丝雀发布
2. 使用 [Rollout 配置](../../stage3/rollout-config) 理解发布策略
3. 跟随 [实操引导](../../stage3/hands-on) 完成 Canary 发布
