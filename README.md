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

**建议硬件配置**: 4 CPU / 8GB RAM / 30GB 磁盘

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
│   ├── setup-all.sh               # ★ 一键搭建入口（推荐）
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

## 参考资源

- [Argo CD 官方文档](https://argoproj.github.io/argo-cd/)
- [Argo Rollouts 官方文档](https://argoproj.github.io/argo-rollouts/)
- [GitLab CI 文档](https://docs.gitlab.com/ee/ci/)
- [Kustomize 文档](https://kustomize.io/)
- [OpenGitOps 原则](https://opengitops.dev/)
- [Kind 官方文档](https://kind.sigs.k8s.io/)

## License

MIT
