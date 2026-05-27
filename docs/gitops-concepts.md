# GitOps 核心概念

本文档覆盖 GitOps 四大核心原则，每个概念均配有代码示例和操作流程。

---

## 1. 声明式 vs 命令式

### 命令式（Imperative）

逐步告诉系统「做什么」。问题：步骤多、难复现、无法审计。

```bash
# 命令式部署 —— 每步手动执行
kubectl run myapp --image=myapp:v1 --port=80
kubectl expose deployment myapp --port=80 --type=ClusterIP
kubectl set image deployment/myapp myapp=myapp:v2
kubectl scale deployment myapp --replicas=3
```

### 声明式（Declarative）

只描述「最终状态」，系统自动收敛。好处：可版本控制、可审计、可复现。

```yaml
# k8s/deployment.yaml —— 声明式描述最终状态
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3          # 期望 3 个副本
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:v2  # 期望使用 v2 镜像
          ports:
            - containerPort: 80
```

### 对比总结

| 维度 | 命令式 | 声明式 |
|------|--------|--------|
| 描述方式 | "做什么" | "要什么" |
| 状态管理 | 隐式（在操作者脑中） | 显式（在文件中） |
| 可复现性 | 低（依赖操作顺序） | 高（直接 apply） |
| 可审计性 | 需记录命令历史 | Git log 即审计日志 |
| 回滚方式 | 反向操作（容易出错） | `git revert` + 自动同步 |
| 团队协作 | 口头/wiki 传递 | PR Review 传递 |

> **GitOps 原则**：所有环境配置必须声明式描述，存储在 Git 中。

---

## 2. Git 单一可信源（Single Source of Truth）

Git 仓库是应用期望状态的唯一权威来源。Argo CD 持续对比 Git 中的声明与集群中的实际状态。

### 工作流程

```
开发者修改 YAML → Git Push → Argo CD 检测差异 → 自动/手动同步到集群
```

### 目录结构示例

```
├── stage1-static-deploy/
│   ├── k8s/
│   │   ├── deployment.yaml    ← 声明 Deployment
│   │   ├── service.yaml       ← 声明 Service
│   │   └── argocd-app.yaml    ← Argo CD Application（指向本仓库）
│   ├── Dockerfile
│   └── .gitlab-ci.yml
```

### Argo CD Application 配置

```yaml
# argocd-app.yaml —— 告诉 Argo CD 去哪里读声明式配置
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: 'http://gitlab.local:8929/root/cicd-demo.git'  # Git 仓库地址
    targetRevision: main                                      # 分支
    path: stage1-static-deploy/k8s                            # YAML 路径
  destination:
    server: 'https://kubernetes.default.svc'                  # 目标集群
    namespace: default
  syncPolicy:
    automated:
      prune: true    # 自动删除 Git 中已移除的资源
      selfHeal: true # 自动修正手动修改（如 kubectl edit）
```

### 为什么 Git 是单一可信源？

1. **审计**：`git log` 记录每次变更的 who/when/why
2. **回滚**：`git revert` 即可恢复到任意历史版本
3. **协作**：PR/MR 流程确保变更经过 Review
4. **一致**：所有环境从同一个仓库派生，避免配置漂移

---

## 3. Auto Sync vs Manual Sync

Argo CD 支持两种同步策略，适用于不同场景。

### Auto Sync（自动同步）

Git 变更后自动应用到集群。适合开发/测试环境。

```yaml
# 自动同步 —— Git 变更即部署
spec:
  syncPolicy:
    automated:
      prune: true      # 自动清理多余资源
      selfHeal: true   # 自动修复漂移
    syncOptions:
      - CreateNamespace=true
```

**适用场景**：
- 开发环境（快速迭代）
- 个人项目
- CI/CD 自动化流程

### Manual Sync（手动同步）

Git 变更后需人工确认才部署。适合生产环境。

```yaml
# 手动同步 —— 变更需人工确认
spec:
  syncPolicy: {}  # 留空 = 手动模式
  # 或显式声明：
  # syncPolicy:
  #   automated: null
```

**操作步骤**：
1. Git push 后 Argo CD 显示 `Out of Sync`
2. 在 Argo CD Dashboard 点击 `Sync`
3. 确认后 Argo CD 执行同步

### 在 CI Pipeline 中手动门禁

```yaml
# .gitlab-ci.yml —— prod 环境需要手动触发
deploy:prod:
  stage: deploy
  script:
    - echo "Deploying to production..."
  when: manual        # ← 关键：需要人工点击才会执行
  environment:
    name: production
  only:
    - main
```

### 对比总结

| 维度 | Auto Sync | Manual Sync |
|------|-----------|-------------|
| 触发方式 | Git push 自动 | 人工点击 Sync |
| 适用环境 | dev / staging | prod |
| 安全性 | 低（任何 push 即部署） | 高（需人工确认） |
| 响应速度 | 秒级 | 取决于人工操作 |
| 漂移修复 | selfHeal 自动修复 | 需手动 Sync |

---

## 4. Rollback 回滚演示

GitOps 下的回滚就是 `git revert`，Argo CD 自动检测到 Git 变化后完成集群回滚。

### 回滚流程

```
发现问题 → git revert → Git push → Argo CD 检测变更 → 自动同步旧版本 → 回滚完成
```

### 操作演示

#### 步骤 1：查看当前部署版本

```bash
# 查看当前 Deployment 使用的镜像版本
kubectl get deployment myapp -o jsonpath='{.spec.template.spec.containers[0].image}'
# 输出示例: registry.local/myapp:v2
```

#### 步骤 2：回滚 Git 提交

```bash
# 查看提交历史
git log --oneline
# 输出:
# a3f5b2d chore: update image to v2
# e1c4d8a feat: add service.yaml
# 9b2a1f0 init: add deployment.yaml

# 回滚到 v1 版本（假设 e1c4d8a 是 v1）
git revert a3f5b2d
git push origin main
```

#### 步骤 3：Argo CD 自动同步

```bash
# 观察 Argo CD 同步状态（如果启用了 Auto Sync）
kubectl get application myapp -n argocd -o jsonpath='{.status.sync.status}'
# 输出: Synced（回滚完成后）

# 确认集群中的镜像版本已恢复
kubectl get deployment myapp -o jsonpath='{.spec.template.spec.containers[0].image}'
# 输出: registry.local/myapp:v1  ← 已回滚到 v1
```

### Argo CD CLI 回滚（Manual Sync 模式）

```bash
# 查看部署历史
argocd app history myapp

# 回滚到指定 revision
argocd app rollback myapp <revision-id>
# 注意：这会导致 Argo CD 显示 Out of Sync
# 如果启用了 selfHeal，Argo CD 会自动同步回 Git 最新版本
# 因此生产环境回滚应该通过 git revert，而不是 argocd rollback
```

### 关键原则

> **生产环境回滚 = git revert + push，而不是 argocd rollback**
>
> - `git revert`：Git 和集群状态一致，符合 GitOps 原则
> - `argocd rollback`：仅回滚集群，Git 仍然是新版本，下次 selfHeal 会恢复到新版本（非预期行为）

### Argo Rollouts 自动回滚（Stage 3 Canary）

```yaml
# analysis-template.yaml —— 定义自动回滚条件
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  metrics:
    - name: success-rate
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_success{app="myapp"}[5m]))
            /
            sum(rate(http_requests_total{app="myapp"}[5m]))
      successCondition: result[0] >= 0.95  # 成功率低于 95% 触发回滚
      failureLimit: 3
```

当 AnalysisTemplate 检测到成功率低于 95% 时，Argo Rollouts 自动回滚到稳定版本，无需人工干预。

---

## 小结

| 概念 | 核心原则 | 实践要点 |
|------|----------|----------|
| 声明式配置 | 描述"要什么"而非"做什么" | 所有 YAML 存 Git |
| Git 单一可信源 | Git = 唯一权威 | PR Review + git log 审计 |
| 同步策略 | Auto/Manual 按环境选择 | dev 自动，prod 手动 |
| 回滚 | git revert 优先 | 避免 argocd rollback + selfHeal 冲突 |
