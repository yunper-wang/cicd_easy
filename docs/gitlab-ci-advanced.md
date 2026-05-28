# GitLab CI 高级模式

> 从传统 CI/CD 实践中提炼的高级 GitLab CI 模式，用于对比学习本项目所用的 GitOps 方案。

## 1. CI Pipeline 回滚阶段

传统 CI/CD 流水线通常包含显式的 `rollback` stage，用于在部署失败后手动回滚到上一版本。

### 传统方案（Docker Compose 部署）

```yaml
# 传统方案：通过 SSH 回滚 Docker 容器
stages:
  - build
  - deploy
  - rollback    # 显式回滚阶段

rollback:
  stage: rollback
  when: manual   # 手动触发
  script:
    - ssh ${DEPLOY_USER}@${DEPLOY_HOST}
        "docker pull ${IMAGE_NAME}:${PREVIOUS_TAG}
         && docker-compose up -d"
  only:
    refs:
      - main
```

### 本项目 GitOps 方案（Argo CD）

```yaml
# GitOps 方案：回滚即 git revert
# 不需要显式 rollback stage，Argo CD 保证状态一致
#
# 回滚方式：
#   1. git revert HEAD — 回退 deployment.yaml 的镜像 tag
#   2. Argo CD 自动检测变更，同步回上一版本
#   3. K8s 滚动更新自动替换 Pod
#
# Stage 3 (Canary) 更有自动回滚：
#   Argo Rollouts 检测 AnalysisTemplate 指标失败时自动回滚
```

### 对比

| 维度 | 传统 rollback stage | GitOps 回滚 |
|------|-------------------|------------|
| 触发方式 | 手动点击 CI job | `git revert` 或自动 |
| 回滚粒度 | 整个容器 | K8s Pod 级别 |
| 状态保证 | 无（需手动验证） | Argo CD 保证期望状态 |
| 适用场景 | Docker Compose 部署 | Kubernetes + Argo CD |

---

## 2. 生产环境部署模式切换（PROD_DEPLOY_WHEN）

传统方案通过 CI 变量 `PROD_DEPLOY_WHEN` 动态控制生产环境是手动还是自动部署。

### 传统方案

```yaml
# 传统方案：通过变量控制 when
deploy_prod:
  stage: deploy
  script:
    - ./deploy.sh production
  when: ${PROD_DEPLOY_WHEN}    # 值为 "manual" 或 "on_success"
  only:
    refs:
      - main
```

在 GitLab CI/CD Variables 中设置：
- `PROD_DEPLOY_WHEN = "manual"` → 生产需手动点击
- `PROD_DEPLOY_WHEN = "on_success"` → 上游成功后自动部署

### 本项目 GitOps 方案（Kustomize + Argo CD）

```yaml
# GitOps 方案：通过 Argo CD syncPolicy 控制
# 不需要 CI 变量切换，直接在 Application YAML 中定义
#
# dev/staging:
apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  syncPolicy:
    automated:
      selfHeal: true    # Auto Sync
#
# prod:
spec:
  syncPolicy: {}        # Manual Sync，需人工在 Argo CD UI 确认
```

### 对比

| 维度 | PROD_DEPLOY_WHEN 变量 | Argo CD syncPolicy |
|------|---------------------|-------------------|
| 控制方式 | GitLab CI 变量 | K8s YAML 声明 |
| 可审计性 | CI 变量历史 | Git 提交历史 |
| 切换成本 | 修改 CI 变量 | 修改 YAML + git push |
| 适用场景 | Docker/SSH 部署 | Kubernetes GitOps |

---

## 3. 独立 build_dev/build_prod 任务

对于需要在构建时注入环境变量的框架（如 Next.js 的 `NEXT_PUBLIC_*`、Vue 的 `VITE_*`），传统方案使用独立的 build 任务分别构建不同环境的镜像。

### 传统方案

```yaml
# Next.js 示例：dev 和 prod 需要不同的环境变量构建
stages:
  - build_dev
  - build_prod
  - deploy_dev
  - deploy_prod

build_dev:
  stage: build_dev
  script:
    - docker build
        --build-arg NEXT_PUBLIC_API_URL=${DEV_API_URL}
        -t ${IMAGE_NAME}:dev .
  only:
    refs:
      - develop

build_prod:
  stage: build_prod
  script:
    - docker build
        --build-arg NEXT_PUBLIC_API_URL=${PROD_API_URL}
        -t ${IMAGE_NAME}:latest .
  only:
    refs:
      - main
```

### 本项目 GitOps 方案

```yaml
# GitOps 方案：统一构建 + Kustomize 环境覆盖
# 只需构建一次镜像，环境差异通过 Kustomize overlay 处理
#
# CI 只有一个 build 任务：
build:
  stage: build
  script:
    - /kaniko/executor
        --destination="${IMAGE_NAME}:${IMAGE_TAG}"
#
# 环境差异在 overlays/ 中定义：
#   overlays/dev/kustomization.yaml    → 1 replica, low resources
#   overlays/staging/kustomization.yaml → 2 replicas, standard
#   overlays/prod/kustomization.yaml   → 3 replicas, high resources
```

### 对比

| 维度 | 独立 build 任务 | Kustomize overlay |
|------|---------------|------------------|
| 构建次数 | 2 次（dev + prod） | 1 次 |
| 环境变量注入 | 构建时 `--build-arg` | 运行时 ConfigMap/Secret |
| 镜像数量 | 2 个（:dev + :latest） | 1 个（同一 tag） |
| 适用框架 | Next.js, Vue (Vite) | 任何应用 |
| 安全性 | 环境变量烘焙进镜像 | 运行时注入，不进镜像层 |

---

## 总结

| 模式 | 传统方案优势 | GitOps 方案优势 |
|------|------------|---------------|
| 回滚阶段 | 直观，CI UI 一键触发 | 自动化，状态保证 |
| 部署模式切换 | 灵活，CI 变量即时生效 | 可审计，Git 即配置 |
| 独立构建 | 适合前端框架构建时注入 | 一次构建，环境配置分离 |

> 本项目采用 GitOps 方案。以上传统模式仅作对比学习参考，帮助理解两种方案的取舍。
