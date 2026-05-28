---
sidebar_position: 3
title: 配置对比
---

# Config Diff Viewer

通过配置对比理解每一步变更的含义。左侧是基础配置，右侧是修改后的配置，差异部分会高亮显示。

import ConfigDiffViewer from '@site/src/components/ConfigDiffViewer';

## 场景 1: 调整副本数

将 Deployment 的 replicas 从 1 调整为 3：

<ConfigDiffViewer
  oldConfig={`apiVersion: apps/v1
kind: Deployment
metadata:
  name: stage1-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: stage1-app
  template:
    spec:
      containers:
      - name: app
        image: registry.local/stage1-app:latest
        ports:
        - containerPort: 80`}
  newConfig={`apiVersion: apps/v1
kind: Deployment
metadata:
  name: stage1-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: stage1-app
  template:
    spec:
      containers:
      - name: app
        image: registry.local/stage1-app:latest
        ports:
        - containerPort: 80`}
  title="replicas: 1 → 3"
/>

## 场景 2: 更新镜像版本

将镜像标签从 `latest` 更新为 `v1.0.0`：

<ConfigDiffViewer
  oldConfig={`apiVersion: apps/v1
kind: Deployment
metadata:
  name: stage1-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: stage1-app
  template:
    spec:
      containers:
      - name: app
        image: registry.local/stage1-app:latest
        ports:
        - containerPort: 80`}
  newConfig={`apiVersion: apps/v1
kind: Deployment
metadata:
  name: stage1-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: stage1-app
  template:
    spec:
      containers:
      - name: app
        image: registry.local/stage1-app:v1.0.0
        ports:
        - containerPort: 80`}
  title="image: latest → v1.0.0"
/>

## 要点

- **replicas 变更** — 直接修改 Deployment 的 replicas 字段，Argo CD 检测到差异后自动同步
- **image 变更** — 更新镜像标签是最常见的发布方式，触发滚动更新

下一步: [实操引导](./hands-on)
