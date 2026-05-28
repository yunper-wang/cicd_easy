# CI/CD GitOps 练手项目

> 从零到生产级的 CI/CD GitOps 全流程实践项目。通过 3 个渐进式 Stage，掌握 GitLab CI + Argo CD + Argo Rollouts 的完整 GitOps 工作流。

## 项目简介

本项目是一套完整的 CI/CD GitOps 学习方案，基于 [cuiliangblog.cn](https://www.cuiliangblog.cn/detail/article/88) 文章中的 GitLab CI + Argo CD 实践方案扩展而来，包含 5 个维度的内容：

| 维度 | 内容 |
|------|------|
| **递进式示例** | 3 个 Stage 从入门到生产级（静态部署 → 多环境 → Canary） |
| **详细步骤与图解** | 每个 Stage 配备四段式操作指南 + Mermaid 流程图 |
| **GitOps 核心概念** | 声明式 vs 命令式、Git 单一可信源、Auto/Manual Sync、Rollback |
| **本地环境搭建** | 一键脚本搭建 Kind + GitLab CE + Argo CD + Argo Rollouts |
| **学习路线图** | L1-L3 成熟度等级，7-10 天学习计划 |

## 架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                     开发者工作流                                  │
│                                                                 │
│  git push ──▶ GitLab CE ──▶ GitLab CI ──▶ Container Registry   │
│                   │                              │               │
│                   │                              ▼               │
│                   │                   更新 K8s Manifest (YAML)  │
│                   │                              │               │
│                   ▼                              ▼               │
│              Argo CD 检测 Git 变更 ◀─────────────┘               │
│                   │                                             │
│                   ▼                                             │
│          ┌────────────────┐                                     │
│          │  Stage 1: Auto │  直接同步到 K8s                       │
│          │  Stage 2: 手动 │  dev/staging 自动，prod 需人工确认     │
│          │  Stage 3: Canary│ 渐进式 20→40→60→100% + 自动回滚     │
│          └────────────────┘                                     │
│                   │                                             │
│                   ▼                                             │
│          Kind Kubernetes 集群 (3 节点)                           │
└─────────────────────────────────────────────────────────────────┘
```

## 快速开始

### 前置要求

| 工具 | 版本 | 安装方式 |
|------|------|----------|
| Docker | ≥ 20.10 | [官方文档](https://docs.docker.com/get-docker/) |
| kubectl | ≥ 1.29 | [官方文档](https://kubernetes.io/docs/tasks/tools/) |
| helm | ≥ 3.12 | [官方文档](https://helm.sh/docs/intro/install/) |
| git | ≥ 2.30 | 系统包管理器 |
| [Kind](https://kind.sigs.k8s.io/) | ≥ 0.20 | [官方文档](https://kind.sigs.k8s.io/docs/user/quick-start/) |

**建议硬件配置**: 4 CPU / 8GB RAM / 30GB 磁盘

> **方案定位**：本项目采用 Kubernetes GitOps 方案（Argo CD + Argo Rollouts）。如果你对传统 Docker Compose + SSH 部署模式也感兴趣，可以参考 [TANGandXUE/cicd-setup](https://github.com/TANGandXUE/cicd-setup) 项目。详见 [部署模式对比文档](docs/deploy-patterns-comparison.md)。

### 一键搭建

```bash
# 克隆项目
git clone https://github.com/yunper-wang/cicd_easy.git
cd cicd_easy

# 一键搭建所有基础设施
# 包含: Kind 集群 + GitLab CE + Argo CD + Argo Rollouts
./scripts/setup-all.sh
```

### 逐步搭建

如果一键脚本遇到问题，可以逐步执行：

```bash
./scripts/install-kind.sh          # Step 1: 创建 Kind 集群 (K8s v1.29.2)
./scripts/install-gitlab.sh        # Step 2: 部署 GitLab CE (Docker, 端口 8929)
./scripts/install-argocd.sh        # Step 3: 安装 Argo CD (Helm, Auto Sync)
./scripts/install-argo-rollouts.sh # Step 4: 安装 Argo Rollouts (Stage 3 需要)
./scripts/register-runner.sh       # Step 5: 注册 GitLab Runner (交互式指南)
```

搭建完成后访问：
- GitLab: http://localhost:8929 (root / 初始密码见容器日志)
- Argo CD: https://localhost:8080 (admin / 见 secret)

### 使用 setup.sh 增强版脚本（推荐）

`setup.sh` 是增强版搭建脚本，在 `setup-all.sh` 基础上增加了依赖检查、GitLab 项目自动创建、Argo CD Application 注册等功能。

```bash
# 完整搭建（推荐首次使用）
./scripts/setup.sh

# 仅初始化指定 Stage
./scripts/setup.sh --stage1     # Stage 1: 静态部署
./scripts/setup.sh --stage2     # Stage 2: 多环境
./scripts/setup.sh --stage3     # Stage 3: Canary

# 跳过基础设施（集群已就绪时）
./scripts/setup.sh --skip-infra

# 精细控制各组件
./scripts/setup.sh --skip-kind      # 跳过 Kind 集群创建
./scripts/setup.sh --skip-gitlab    # 跳过 GitLab 部署
./scripts/setup.sh --skip-argocd    # 跳过 Argo CD 安装
./scripts/setup.sh --skip-rollouts  # 跳过 Argo Rollouts（Stage 3 才需要）
./scripts/setup.sh --skip-push      # 跳过代码推送到 GitLab
./scripts/setup.sh --skip-apps      # 跳过 Argo CD Application 注册

# 自动化模式（跳过确认提示）
./scripts/setup.sh -y
```

**脚本执行流程**:

| Phase | 内容 | 说明 |
|-------|------|------|
| Phase 0 | 依赖检查 | 校验 Docker/kubectl/helm/git 版本，检查系统资源（建议 8GB RAM） |
| Phase 1 | 基础设施搭建 | Kind 集群 → GitLab CE → Argo CD → Argo Rollouts |
| Phase 2 | GitLab 配置 | 等待 GitLab 就绪 → 创建项目 → 推送代码 → Runner 注册提示 |
| Phase 3 | Argo CD 配置 | 注册 Application（Stage 1/2/3），触发 Sync |
| Phase 4 | 验证 | 检查各 Stage Pod 状态，输出访问信息汇总 |

## 分 Stage 操作指南

### Stage 1 操作与验证

```bash
# 1. 初始化 Stage 1 环境
./scripts/setup.sh --stage1

# 2. 验证 Argo CD Application 状态
kubectl get application -n argocd
# 期望看到 stage1-app 状态为 Synced 且 Healthy

# 3. 检查 Pod 状态
kubectl get pods -l app=stage1-app
# 期望看到 2 个 Running Pod

# 4. 本地访问服务
kubectl port-forward svc/stage1-svc 8080:80
# 浏览器打开 http://localhost:8080

# 5. 触发新部署（修改代码后）
# 推送到 GitLab → CI 自动构建镜像 → Argo CD Auto Sync → Pod 更新
```

### Stage 2 操作与验证

```bash
# 1. 初始化 Stage 2 环境
./scripts/setup.sh --stage2

# 2. 验证 3 个环境的 Application
kubectl get application -n argocd
# 期望看到 stage2-dev、stage2-staging、stage2-prod

# 3. 检查各环境 Pod
kubectl get pods -n dev -l app=stage2-app      # 1 replica
kubectl get pods -n staging -l app=stage2-app   # 2 replicas
kubectl get pods -n prod -l app=stage2-app      # 3 replicas

# 4. 本地访问 dev 环境
kubectl port-forward -n dev svc/stage2-svc 8081:80
# 浏览器打开 http://localhost:8081

# 5. Prod 部署（需手动触发）
# 方式一: Argo CD Dashboard → stage2-prod → Sync 按钮
# 方式二: GitLab CI Pipeline → prod 阶段 → 点击手动触发按钮
```

### Stage 3 操作与验证

```bash
# 1. 初始化 Stage 3 环境
./scripts/setup.sh --stage3

# 2. 验证 Rollout 资源
kubectl get rollout stage3-app
# 期望看到 REVISION 1, 活跃副本数

# 3. 查看 Canary 发布状态
kubectl argo rollouts get rollout stage3-app

# 4. 触发 Canary 发布（更新镜像版本）
kubectl argo rollouts set image stage3-app web=gitlab.local:5050/root/cicd-demo/stage3:v2

# 5. 观察发布进度
# 20% → 分析(60s) → 40% → 分析 → 60% → 分析 → 100%
# 分析失败时自动回滚到上一版本
```

## 三个 Stage 详解

### Stage 1: 静态页面自动部署（L1 入门）

**数据流**:
```
Git Push → GitLab CI → Kaniko 构建镜像 → Registry Push → 更新 YAML → Argo CD Auto Sync → K8s
```

**学习重点**:
- GitOps 基本闭环：代码提交即部署
- Argo CD Auto Sync + Self Heal
- Kaniko 集群内镜像构建
- 声明式配置 vs 命令式操作

**关键文件**:
- `.gitlab-ci.yml` — 3 阶段 CI Pipeline（build → publish → deploy）
- `k8s/argocd-app.yaml` — Argo CD Application（Auto Sync + Self Heal）
- `k8s/deployment.yaml` — 2 副本 Deployment + 健康检查

📖 [详细操作指南](docs/guide-stage1.md) | ⏱ 预计 2-3 天

### Stage 2: 多环境发布（L2 进阶）

**数据流**:
```
Git Push → CI Build → Dev (自动) → Staging (自动) → Prod (手动门控)
```

**学习重点**:
- Kustomize base/overlay 配置管理模式
- 3 套环境命名空间隔离（dev / staging / prod）
- GitLab CI `when: manual` 手动门控
- Argo CD Manual Sync 保护生产环境

**关键文件**:
- `k8s/base/` — 共享 Deployment + Service
- `k8s/overlays/{dev,staging,prod}/` — 环境差异化配置（副本数/资源/标签）
- `k8s/argocd-apps/prod.yaml` — Manual Sync Application

**环境差异**:

| 维度 | Dev | Staging | Prod |
|------|-----|---------|------|
| 副本数 | 1 | 2 | 3 |
| CPU 限制 | 100m | 200m | 500m |
| 内存限制 | 64Mi | 128Mi | 256Mi |
| 同步策略 | Auto | Auto | Manual |

📖 [详细操作指南](docs/guide-stage2.md) | ⏱ 预计 2-3 天

### Stage 3: Canary 金丝雀发布（L3 生产）

**数据流**:
```
Git Push → CI Build → Argo Rollouts 触发 → 20% → 分析 → 40% → 分析 → 60% → 分析 → 100%
                                                                    │
                                                              分析失败 → 自动回滚
```

**学习重点**:
- Argo Rollouts 替代标准 Deployment
- 渐进式 Canary 流量切换（20% → 40% → 60% → 100%）
- AnalysisTemplate 业务指标分析（成功率 / 延迟）
- 自动回滚保护机制

**关键文件**:
- `k8s/rollout.yaml` — Argo Rollouts CRD，4 步 Canary 策略
- `k8s/analysis-template.yaml` — Prometheus 成功率 + Web 健康检查
- `k8s/service-stable.yaml` + `service-canary.yaml` — 双 Service 流量路由

📖 [详细操作指南](docs/guide-stage3.md) | ⏱ 预计 3-4 天

## 目录结构

```
cicd_easy/
├── scripts/                        # 环境搭建脚本
│   ├── setup.sh                  # ★ 增强版一键搭建（推荐）
│   ├── setup-all.sh               # 基础版一键搭建
│   ├── install-kind.sh            # Kind 集群 (3 节点, port 80/443)
│   ├── install-gitlab.sh          # GitLab CE (Docker, 4GB mem)
│   ├── install-argocd.sh          # Argo CD (Helm + Ingress)
│   ├── install-argo-rollouts.sh   # Argo Rollouts Controller
│   └── register-runner.sh         # Runner 注册指南
├── stage1-static-deploy/           # Stage 1: 静态页面自动部署
│   ├── .gitlab-ci.yml             # CI Pipeline (Kaniko 构建)
│   ├── Dockerfile                 # Nginx 1.25-alpine
│   ├── index.html                 # 示例页面
│   └── k8s/
│       ├── deployment.yaml        # 2 副本 + 健康检查
│       ├── service.yaml           # ClusterIP
│       └── argocd-app.yaml        # Auto Sync + Self Heal
├── stage2-multi-env/               # Stage 2: 多环境发布
│   ├── .gitlab-ci.yml             # CI Pipeline (when:manual 门控)
│   ├── Dockerfile
│   ├── index.html
│   └── k8s/
│       ├── base/                  # Kustomize 共享配置
│       │   ├── deployment.yaml
│       │   ├── service.yaml
│       │   └── kustomization.yaml
│       ├── overlays/              # 环境覆盖
│       │   ├── dev/               # 1 replica, low resources
│       │   ├── staging/           # 2 replicas, standard
│       │   └── prod/              # 3 replicas, high resources
│       └── argocd-apps/           # 3 个 Argo CD Application
│           ├── dev.yaml           # Auto Sync
│           ├── staging.yaml       # Auto Sync
│           └── prod.yaml          # Manual Sync
├── stage3-canary/                  # Stage 3: Canary 金丝雀发布
│   ├── .gitlab-ci.yml
│   ├── Dockerfile
│   ├── index.html
│   └── k8s/
│       ├── rollout.yaml           # Rollout CRD (20→40→60→100%)
│       ├── service-stable.yaml    # Stable Service
│       ├── service-canary.yaml    # Canary Service
│       ├── analysis-template.yaml # Prometheus + Web 分析
│       └── argocd-app.yaml
├── docs/                           # 文档
│   ├── gitops-concepts.md         # GitOps 四大核心概念 (含代码示例)
│   ├── guide-stage1.md            # Stage 1 操作指南 (Mermaid 流程图)
│   ├── guide-stage2.md            # Stage 2 操作指南 (分支策略 + 门控)
│   ├── guide-stage3.md            # Stage 3 操作指南 (Canary 序列图)
│   ├── gitlab-ci-advanced.md      # GitLab CI 高级模式 (回滚/部署切换/独立构建)
│   ├── deploy-patterns-comparison.md # 部署模式对比 (传统 Docker vs GitOps)
│   └── learning-roadmap.md        # 学习路线图 (L1-L3, 7-10 天)
└── README.md                       # 本文件
```

## 技术栈

| 组件 | 版本 | 用途 |
|------|------|------|
| [Kind](https://kind.sigs.k8s.io/) | latest | 本地 Kubernetes 集群 (Docker 内) |
| [Kubernetes](https://kubernetes.io/) | v1.29.2 | 容器编排 |
| [GitLab CE](https://about.gitlab.com/) | latest | 代码托管 + CI/CD + Container Registry |
| [Argo CD](https://argoproj.github.io/argo-cd/) | 7.3.4 (Helm) | GitOps 持续交付 |
| [Argo Rollouts](https://argoproj.github.io/argo-rollouts/) | latest | Canary / Blue-Green 部署 |
| [Kustomize](https://kustomize.io/) | kubectl 内置 | 多环境配置管理 (base/overlay) |
| [Kaniko](https://github.com/GoogleContainerTools/kaniko) | latest | 集群内镜像构建 (无需 Docker daemon) |
| [NGINX Ingress](https://kubernetes.github.io/ingress-nginx/) | latest | Ingress Controller |
| [Nginx](https://nginx.org/) | 1.25-alpine | 静态页面托管 (~7MB) |

## 学习路线图

按每天 2-3 小时计算，完成全部 Stage 约需 **7-10 天**。

| Stage | 名称 | 耗时 | 等级 | 核心收获 |
|-------|------|------|------|----------|
| Stage 1 | 静态页面自动部署 | 2-3 天 | **L1 入门** | GitOps 基本闭环 |
| Stage 2 | 多环境发布 | 2-3 天 | **L2 进阶** | Kustomize + 手动门控 |
| Stage 3 | Canary 金丝雀发布 | 3-4 天 | **L3 生产** | 渐进式发布 + 自动回滚 |

**GitOps 成熟度等级**:
- **L1** — 自动化部署：Git Push 即部署，理解声明式配置
- **L2** — 环境管理：多环境隔离，手动门控保护生产
- **L3** — 渐进式发布：Canary 策略，业务指标分析，自动回滚

📖 [详细学习路线图](docs/learning-roadmap.md)

## GitOps 核心概念

本项目覆盖 GitOps 四大核心原则，每个概念均配有代码示例：

| 概念 | 核心原则 | 本项目体现 |
|------|----------|------------|
| 声明式配置 | 描述"要什么"而非"做什么" | 所有 K8s 资源以 YAML 存储 |
| Git 单一可信源 | Git = 唯一权威 | Argo CD 从 Git 读取期望状态 |
| 同步策略 | Auto/Manual 按环境选择 | dev 自动，prod 手动 |
| 回滚 | git revert 优先 | Stage 3 支持自动回滚 |

📖 [详细概念文档](docs/gitops-concepts.md)

## 常见问题与排错

### 脚本执行失败自查清单

| 问题 | 可能原因 | 解决方法 |
|------|----------|----------|
| Docker 未运行 | Docker daemon 未启动 | `sudo systemctl start docker` 或打开 Docker Desktop |
| Kind 集群创建失败 | 端口 80/443 被占用 | 停止占用端口的进程，或 `docker rm -f $(docker ps -aq)` 清理容器 |
| GitLab 启动超时 | 内存不足（需 4GB+） | 增加 Docker 内存限制：Docker Desktop → Settings → Resources → Memory ≥ 8GB |
| GitLab 密码获取失败 | 容器未完全启动（首次需 5-10 分钟） | `docker logs gitlab-ce --tail 50` 检查日志，等待后再试 |
| Argo CD 密码为空 | Pod 尚未全部就绪 | `kubectl get pods -n argocd` 确认所有 Pod Running 后重试 |
| Pod 一直 Pending | 节点资源不足 | `kubectl describe pod <name>` 查看事件，考虑减少副本数 |
| 镜像拉取失败 | Registry 未就绪或 CI 变量未配置 | 确认 GitLab Container Registry 在 5050 端口运行，检查 CI 变量 |
| Argo CD Sync 失败 | Git 仓库路径不匹配 | 检查 Application manifest 中的 `repoURL` 和 `path` 是否正确 |

### 常用调试命令

```bash
# 查看集群状态
kubectl cluster-info
kubectl get nodes

# 查看 GitLab 容器日志
docker logs gitlab-ce --tail 100 -f

# 获取 Argo CD admin 密码
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 -d

# 查看所有命名空间的 Pod
kubectl get pods -A

# 查看 Rollout 状态（Stage 3）
kubectl argo rollouts list rollouts

# 重新运行 setup.sh（跳过已就绪组件）
./scripts/setup.sh --skip-infra
```

## 参考资源

- [Argo CD 官方文档](https://argoproj.github.io/argo-cd/)
- [Argo Rollouts 官方文档](https://argoproj.github.io/argo-rollouts/)
- [GitLab CI 文档](https://docs.gitlab.com/ee/ci/)
- [Kustomize 文档](https://kustomize.io/)
- [OpenGitOps 原则](https://opengitops.dev/)
- [Kind 官方文档](https://kind.sigs.k8s.io/)
- [传统 CI/CD 部署方案参考 (TANGandXUE/cicd-setup)](https://github.com/TANGandXUE/cicd-setup) — 传统 Docker Compose + SSH 部署模式的 CLI 脚手架工具，与本项目 GitOps 方案形成对比

## License

MIT
