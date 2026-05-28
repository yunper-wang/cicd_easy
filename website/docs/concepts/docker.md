---
sidebar_position: 5
title: Docker
---

# Docker 容器基础

## 核心概念

- **Image** — 只读模板，包含运行应用所需的一切
- **Container** — Image 的运行实例
- **Registry** — 存储 and 分发 Image 的服务
- **Dockerfile** — 构建 Image 的指令文件

## 在 CI/CD 中的角色

在 cicd_easy 中，Docker 主要用于：

1. **应用打包** — 将应用代码打包为容器镜像
2. **CI Runner** — GitLab Runner 在容器中执行 Pipeline Job
3. **集群节点** — Kind 使用 Docker 容器模拟 K8s 节点

## Kaniko

本项目使用 Kaniko 在 Kubernetes 集群内构建镜像，无需 Docker daemon：

```bash
/kaniko/executor \
  --dockerfile=Dockerfile \
  --context=. \
  --destination=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
```
