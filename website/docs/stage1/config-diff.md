---
sidebar_position: 3
title: 配置对比
---

# 多环境配置对比

在实际项目中，同一个应用需要部署到多个环境（dev、staging、prod），每个环境有不同的配置参数。理解这些差异是掌握 CI/CD 的关键。

## 为什么需要不同的环境？

| 环境 | 用途 | 副本数 | 镜像标签 | 资源限制 |
|------|------|--------|----------|----------|
| **dev** | 开发调试 | 1 | `dev-latest` | 最小 |
| **staging** | 预发布验证 | 2 | `staging-latest` | 中等 |
| **prod** | 生产环境 | 3+ | `v1.0.0`（固定版本） | 充足 |

## 环境配置对比: dev vs staging vs prod

### Deployment 配置差异

以下是三个环境的 Deployment 配置对比。注意观察关键差异点：

#### dev 环境

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cicd-easy-app
  namespace: dev
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cicd-easy-app
  template:
    spec:
      containers:
      - name: app
        image: registry.local/cicd-easy-app:dev-latest
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 128Mi
        env:
        - name: LOG_LEVEL
          value: "debug"
        - name: APP_ENV
          value: "development"
```

#### staging 环境

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cicd-easy-app
  namespace: staging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cicd-easy-app
  template:
    spec:
      containers:
      - name: app
        image: registry.local/cicd-easy-app:staging-latest
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
        env:
        - name: LOG_LEVEL
          value: "info"
        - name: APP_ENV
          value: "staging"
```

#### prod 环境

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cicd-easy-app
  namespace: prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cicd-easy-app
  template:
    spec:
      containers:
      - name: app
        image: registry.local/cicd-easy-app:v1.0.0
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 512Mi
        env:
        - name: LOG_LEVEL
          value: "warn"
        - name: APP_ENV
          value: "production"
```

## 关键差异详解

### 1. 副本数（Replicas）

```
dev:     replicas: 1    ← 最小资源，单人调试即可
staging: replicas: 2    ← 中等规模，验证扩展性
prod:    replicas: 3+   ← 高可用要求，至少跨 3 个节点
```

副本数直接影响可用性和成本。开发环境只需要 1 个副本用于调试，而生产环境需要至少 3 个副本保证高可用（容忍 1 个节点故障）。

### 2. 镜像标签策略

```
dev:     dev-latest        ← 每次提交自动更新
staging: staging-latest    ← 通过测试的版本
prod:    v1.0.0            ← 固定版本号，变更受控
```

- `dev-latest` 和 `staging-latest` 是滚动标签，始终指向最新构建
- 生产环境使用固定版本号（如 `v1.0.0`），升级必须显式修改

### 3. 资源限制（Resources）

| 环境 | CPU 请求 | CPU 限制 | 内存请求 | 内存限制 |
|------|---------|---------|---------|---------|
| dev | 50m | 200m | 64Mi | 128Mi |
| staging | 100m | 500m | 128Mi | 256Mi |
| prod | 200m | 1000m | 256Mi | 512Mi |

资源限制确保了：
- **requests** — 调度器保证分配的最小资源
- **limits** — 容器可使用的最大资源上限

### 4. 环境变量（Environment Variables）

| 变量 | dev | staging | prod |
|------|-----|---------|------|
| `LOG_LEVEL` | debug | info | warn |
| `APP_ENV` | development | staging | production |

环境变量是最常见的差异化配置。日志级别在开发环境设为 `debug` 便于排查问题，在生产环境设为 `warn` 减少日志量。

## GitLab CI 环境变量

在 `.gitlab-ci.yml` 中，可以通过 `variables` 和 `environment` 关键字管理环境差异：

```yaml
deploy-to-dev:
  stage: deploy
  variables:
    DEPLOY_NAMESPACE: "dev"
    IMAGE_TAG: "dev-latest"
  environment:
    name: dev
    url: https://dev.example.com
  script:
    - kubectl set image deployment/cicd-easy-app
        app=registry.local/cicd-easy-app:$IMAGE_TAG
        -n $DEPLOY_NAMESPACE
  only:
    - main

deploy-to-prod:
  stage: deploy
  variables:
    DEPLOY_NAMESPACE: "prod"
    IMAGE_TAG: "v1.0.0"
  environment:
    name: prod
    url: https://prod.example.com
  script:
    - kubectl set image deployment/cicd-easy-app
        app=registry.local/cicd-easy-app:$IMAGE_TAG
        -n $DEPLOY_NAMESPACE
  only:
    - main
  when: manual    # 生产环境需要手动触发
```

注意关键区别：
- dev 环境自动部署（`when: on_success`）
- prod 环境需要手动审批（`when: manual`）

## 要点总结

- 多环境配置的核心差异在于副本数、镜像标签、资源限制和环境变量
- 生产环境使用固定版本标签，非生产环境使用滚动标签
- 日志级别、资源分配应根据环境特点调整
- GitLab CI 的 `environment` 关键字帮助区分不同部署目标

下一步: [实操引导](./hands-on)
