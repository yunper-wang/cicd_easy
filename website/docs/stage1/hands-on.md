---
sidebar_position: 4
title: 实操引导
---

# Stage 1 实操引导

## 目标

从零开始编写一个完整的 `.gitlab-ci.yml`，实现 Git Push -> CI Build -> CD Sync 的 GitOps 闭环。

## 前置条件

- Kind 集群运行正常（`kubectl cluster-info`）
- GitLab 实例可访问
- Argo CD 已安装并配置好

## Step 1: 创建项目骨架

首先，确保项目根目录包含必要的文件：

```
cicd_easy/
  ├── Dockerfile
  ├── index.html
  ├── .gitlab-ci.yml    ← 我们将要创建的文件
  └── labs/
      └── stage1-static-deploy/
          ├── deployment.yaml
          └── service.yaml
```

确认 `Dockerfile` 存在且内容正确：

```dockerfile
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
```

## Step 2: 定义 Stages

创建 `.gitlab-ci.yml`，首先定义 Pipeline 的三个阶段：

```yaml
stages:
  - build
  - test
  - deploy
```

此时 Pipeline 结构如下：

```
Pipeline
  ├── Stage: build
  ├── Stage: test
  └── Stage: deploy
```

## Step 3: 添加 Build Job

在 `build` 阶段添加构建 Job，使用 Kaniko 构建 Docker 镜像并推送到 Registry：

```yaml
stages:
  - build
  - test
  - deploy

variables:
  APP_NAME: "stage1-app"

build-image:
  stage: build
  image:
    name: gcr.io/kaniko-project/executor:debug
    entrypoint: [""]
  script:
    - echo "Building image for commit $CI_COMMIT_SHORT_SHA"
    - /kaniko/executor
      --dockerfile=Dockerfile
      --context=.
      --destination=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
    - echo "Image pushed successfully"
  only:
    - main
```

关键要点：
- `image: gcr.io/kaniko-project/executor:debug` — 使用 Kaniko 镜像，不需要 Docker daemon
- `entrypoint: [""]` — 清空默认入口点，使用自定义 script
- `$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA` — 使用 Git 提交哈希作为镜像标签
- `only: [main]` — 仅 main 分支触发构建

## Step 4: 添加 Test Job

在 `test` 阶段添加测试 Job，验证构建产物的质量：

```yaml
stages:
  - build
  - test
  - deploy

variables:
  APP_NAME: "stage1-app"

build-image:
  stage: build
  image:
    name: gcr.io/kaniko-project/executor:debug
    entrypoint: [""]
  script:
    - /kaniko/executor
      --dockerfile=Dockerfile
      --context=.
      --destination=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  only:
    - main

run-tests:
  stage: test
  image: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  script:
    - echo "Running smoke tests..."
    - curl -f http://localhost:80 || exit 1
    - echo "All tests passed"
  needs: [build-image]
  only:
    - main
```

新增内容说明：
- `image: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA` — 使用上一步构建的镜像
- `needs: [build-image]` — 显式声明依赖，无需等待整个 build stage 完成
- `curl -f http://localhost:80` — 简单的健康检查测试

## Step 5: 添加 Deploy Job

在 `deploy` 阶段添加部署 Job。在 GitOps 模式下，部署实际上是 **更新 Git 仓库中的镜像标签**，由 Argo CD 自动同步到集群：

```yaml
stages:
  - build
  - test
  - deploy

variables:
  APP_NAME: "stage1-app"

build-image:
  stage: build
  image:
    name: gcr.io/kaniko-project/executor:debug
    entrypoint: [""]
  script:
    - /kaniko/executor
      --dockerfile=Dockerfile
      --context=.
      --destination=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  only:
    - main

run-tests:
  stage: test
  image: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  script:
    - echo "Running smoke tests..."
    - curl -f http://localhost:80 || exit 1
    - echo "All tests passed"
  needs: [build-image]
  only:
    - main

update-manifest:
  stage: deploy
  image: alpine:3.18
  script:
    - apk add --no-cache git
    - git config user.name "GitLab CI"
    - git config user.email "ci@gitlab.local"
    - |
      sed -i "s|image: .*|image: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA|g" \
        labs/stage1-static-deploy/deployment.yaml
    - git add labs/stage1-static-deploy/deployment.yaml
    - "git commit -m 'chore: update image to $CI_COMMIT_SHORT_SHA'"
    - git push origin main
  needs: [run-tests]
  only:
    - main
```

这是 GitOps 的精髓所在：
- CI Pipeline **不直接部署到集群**
- 而是更新 Git 仓库中的声明式配置（镜像标签）
- Argo CD 检测到 Git 变更后，自动将新版本同步到集群

## Step 6: 配置 Argo CD Application

在集群中创建 Argo CD Application，监控 Git 仓库的变更：

```bash
argocd app create stage1-app \
  --repo https://your-gitlab.local/cicd_easy.git \
  --path labs/stage1-static-deploy \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace stage1 \
  --sync-policy automated \
  --auto-prune
```

参数说明：
- `--path` — 指向包含 K8s 清单的目录
- `--sync-policy automated` — 自动同步模式，检测到变更即部署
- `--auto-prune` — 自动清理 Git 中已删除的资源

## Step 7: 触发完整流程

现在提交代码并观察完整的 GitOps 闭环：

```bash
# 修改应用代码
echo "<h1>Updated at $(date)</h1>" >> index.html

# 提交并推送
git add .
git commit -m "feat: update application"
git push origin main
```

观察流程：

1. **GitLab CI** — 在 Web UI 查看 Pipeline 运行状态
2. **构建阶段** — Kaniko 构建新镜像并推送到 Registry
3. **测试阶段** — 使用新镜像运行测试
4. **部署阶段** — 自动更新 Git 仓库中的镜像标签
5. **Argo CD** — 检测到 Git 变更，自动同步新版本到集群
6. **验证** — 访问应用确认新版本已生效

```bash
# 检查 Pod 状态
kubectl get pods -n stage1

# 检查 Argo CD 同步状态
argocd app get stage1-app

# 访问应用
kubectl port-forward svc/stage1-app 8080:80 -n stage1
```

## 完整的 .gitlab-ci.yml

最终的完整配置如下：

```yaml
stages:
  - build
  - test
  - deploy

variables:
  APP_NAME: "stage1-app"

# --- Build ---
build-image:
  stage: build
  image:
    name: gcr.io/kaniko-project/executor:debug
    entrypoint: [""]
  script:
    - /kaniko/executor
      --dockerfile=Dockerfile
      --context=.
      --destination=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  only:
    - main

# --- Test ---
run-tests:
  stage: test
  image: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  script:
    - echo "Running smoke tests..."
    - curl -f http://localhost:80 || exit 1
    - echo "All tests passed"
  needs: [build-image]
  only:
    - main

# --- Deploy (GitOps style) ---
update-manifest:
  stage: deploy
  image: alpine:3.18
  script:
    - apk add --no-cache git
    - git config user.name "GitLab CI"
    - git config user.email "ci@gitlab.local"
    - |
      sed -i "s|image: .*|image: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA|g" \
        labs/stage1-static-deploy/deployment.yaml
    - git add labs/stage1-static-deploy/deployment.yaml
    - "git commit -m 'chore: update image to $CI_COMMIT_SHORT_SHA'"
    - git push origin main
  needs: [run-tests]
  only:
    - main
```

## 检查清单

- [ ] Kind 集群运行正常
- [ ] `.gitlab-ci.yml` 包含 build、test、deploy 三个阶段
- [ ] Build Job 使用 Kaniko 构建并推送镜像
- [ ] Test Job 使用构建产物验证质量
- [ ] Deploy Job 更新 Git 仓库中的镜像标签
- [ ] Argo CD Application 已创建且配置自动同步
- [ ] 推送代码后 Pipeline 完整运行成功
- [ ] Argo CD 自动同步新版本到集群
