---
sidebar_position: 1
title: Stage 2 实操
---

# Stage 2: 多环境管理实操

本目录包含 Stage 2 的完整实操资源文件。

## 文件清单

```
labs/stage2-multi-env/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
├── overlay/
│   ├── dev/
│   ├── staging/
│   └── prod/
├── .gitlab-ci.yml
├── Dockerfile
└── index.html
```

## 开始练习

1. 阅读 [Stage 2 概念](../../stage2/concepts) 了解多环境管理
2. 使用 [Kustomize 配置](../../stage2/kustomize-config) 理解配置差异
3. 跟随 [实操引导](../../stage2/hands-on) 完成多环境部署
