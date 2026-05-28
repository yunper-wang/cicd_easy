---
sidebar_position: 2
title: Kustomize 配置
---

# Kustomize 配置详解

## 目录结构

Kustomize 的核心是 base + overlay 模式。一个典型的多环境项目结构如下：

```
k8s/
  ├── base/
  │   ├── deployment.yaml        # 基础 Deployment（所有环境共享）
  │   ├── service.yaml           # 基础 Service（所有环境共享）
  │   └── kustomization.yaml     # base 资源清单
  └── overlays/
      ├── dev/
      │   └── kustomization.yaml # dev 环境差异化配置
      ├── staging/
      │   └── kustomization.yaml # staging 环境差异化配置
      └── prod/
          ├── kustomization.yaml # prod 环境差异化配置
          └── resource-quota.yaml # prod 专用资源配额
```

## base/kustomization.yaml

base 目录包含所有环境共享的基础配置：

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# 引用的 K8s 资源文件
resources:
  - deployment.yaml
  - service.yaml

# 所有环境共享的 Namespace
namespace: stage2

# 所有环境共享的标签
commonLabels:
  app.kubernetes.io/part-of: stage2-multi-env
  app.kubernetes.io/managed-by: kustomize
```

### base/deployment.yaml

基础的 Deployment 定义，不含环境特定的值：

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
        env:
        - name: APP_NAME
          value: "stage2-app"
```

注意：base 中的 `replicas` 和 `resources` 未指定，由各 overlay 自行定义。

## 环境对比表

以下表格展示了三个环境的关键配置差异：

| 配置项 | dev | staging | prod |
|--------|-----|---------|------|
| **replicas** | 1 | 2 | 3 |
| **image tag** | `dev-latest` | `staging-latest` | `v1.0.0` |
| **CPU request** | 50m | 100m | 200m |
| **CPU limit** | 200m | 500m | 1000m |
| **Memory request** | 64Mi | 128Mi | 256Mi |
| **Memory limit** | 128Mi | 256Mi | 512Mi |
| **LOG_LEVEL** | debug | info | warn |
| **namespace** | stage2-dev | stage2-staging | stage2-prod |
| **Sync Policy** | Auto | Auto | Manual |

## overlay/dev/kustomization.yaml

开发环境配置 — 最小资源，便于快速调试：

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# 引用 base 配置
resources:
  - ../../base

# 覆盖 namespace
namespace: stage2-dev

# 使用 JSON Patch 修改特定字段
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

# 添加环境变量
configMapGenerator:
  - name: app-config
    literals:
      - LOG_LEVEL=debug
      - APP_ENV=development
```

## overlay/staging/kustomization.yaml

预发布环境配置 — 中等资源，接近生产配置：

```yaml
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

configMapGenerator:
  - name: app-config
    literals:
      - LOG_LEVEL=info
      - APP_ENV=staging
```

## overlay/prod/kustomization.yaml

生产环境配置 — 充足资源，严格限制：

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base
  - resource-quota.yaml    # 生产专用资源配额
  - network-policy.yaml    # 生产网络隔离策略

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

configMapGenerator:
  - name: app-config
    literals:
      - LOG_LEVEL=warn
      - APP_ENV=production
```

## Strategic Merge Patches

除了 JSON Patch，Kustomize 还支持 Strategic Merge Patch，语法更直观：

```yaml
# overlay/prod/patch-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stage2-app
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: app
        image: registry.local/stage2-app:v1.0.0
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 512Mi
```

在 kustomization.yaml 中引用：

```yaml
patchesStrategicMerge:
  - patch-deployment.yaml
```

### JSON Patch vs Strategic Merge Patch

| 特性 | JSON Patch | Strategic Merge Patch |
|------|-----------|----------------------|
| 语法 | RFC 6902 操作列表 | K8s 原生 YAML 结构 |
| 操作类型 | add/replace/remove/test | 合并（merge） |
| 可读性 | 较低，需要 path 表达式 | 高，直接写目标 YAML |
| 适用场景 | 精确修改单个字段 | 修改多个字段或添加资源 |

## 验证配置

使用 `kustomize build` 预览最终生成的 K8s 清单：

```bash
# 预览 dev 环境配置
kustomize build overlays/dev/

# 预览 prod 环境配置
kustomize build overlays/prod/

# 对比两个环境的差异
diff <(kustomize build overlays/dev/) <(kustomize build overlays/prod/)
```

## 要点总结

- base/ 包含所有环境共享的基础配置
- overlay/ 只定义差异化部分，通过 patch 机制修改 base
- JSON Patch 适合精确修改，Strategic Merge Patch 更直观
- 每个环境使用独立 namespace 实现资源隔离
- `kustomize build` 可以预览最终合并后的完整配置

下一步: [实操引导](./hands-on)
