# cicd_easy — CI/CD 交互式学习平台

> 让 CI/CD 学习简单透明。通过 3 个渐进式 Stage + 交互式组件，掌握 GitLab CI + Argo CD + Argo Rollouts 的完整 GitOps 工作流。

**在线学习**: [https://yunper-wang.github.io/cicd_easy/](https://yunper-wang.github.io/cicd_easy/)

## 项目简介

cicd_easy 是一个 **从零到生产级** 的 CI/CD GitOps 交互式学习平台，核心理念是通过可视化配置和交互式引导，让学习者主动理解 CI/CD 流程中的每个概念。

| 特性 | 说明 |
|------|------|
| **交互式学习** | Pipeline Builder、配置向导、流程模拟器，主动操作理解概念 |
| **3 Stage 渐进式** | 静态部署 → 多环境管理 → Canary 发布，层层递进 |
| **真实技术栈** | GitLab CI、Argo CD、Argo Rollouts、Kubernetes 等行业标准工具 |
| **透明对照** | 每个配置操作对应真实 CI/CD 流程，学习过程即实战过程 |
| **一键搭建** | setup.sh 脚本自动搭建完整的本地 GitOps 环境 |

## 交互式组件

| 组件 | 功能 | 用于 |
|------|------|------|
| **Pipeline Builder** | 3 步向导配置 CI/CD Pipeline，实时生成 YAML | Stage 1 |
| **K8s Manifest Generator** | 多环境配置向导，dev/staging/prod 参数调节 | Stage 2 |
| **Config Diff Viewer** | 配置变更双栏对比，差异高亮 | Stage 1 |
| **Pipeline Simulator** | CI/CD 全流程动画 + Canary 发布模拟（含自动回滚） | Stage 3 |
| **Quiz** | 知识检测，即时反馈 + 得分统计 | 所有 Stage |
| **Code Annotator** | 代码逐行解读，点击标注查看解释 | Stage 1 |

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

### 方式一：在线学习（无需本地环境）

直接访问 [学习网站](https://yunper-wang.github.io/cicd_easy/)，阅读交互式教程和概念文档。

### 方式二：本地搭建 + 实操

```bash
# 克隆项目
git clone https://github.com/yunper-wang/cicd_easy.git
cd cicd_easy

# 一键搭建所有基础设施（推荐首次使用）
./scripts/setup.sh

# 或仅初始化指定 Stage
./scripts/setup.sh --stage1     # Stage 1: 静态部署
./scripts/setup.sh --stage2     # Stage 2: 多环境
./scripts/setup.sh --stage3     # Stage 3: Canary

# 自动化模式
./scripts/setup.sh -y
```

搭建完成后访问：
- GitLab: http://localhost:8929
- Argo CD: https://localhost:8080
- 学习网站: `cd website && npm start`

### 方式三：本地运行学习网站

```bash
cd website
npm install
npm start
# 浏览器打开 http://localhost:3000/cicd_easy/
```

## 3 个学习阶段

### Stage 1: 静态部署 (L1 入门)

**核心**: Git Push → CI Build → CD Sync 完整闭环

| 学习内容 | 交互组件 |
|----------|----------|
| GitOps 四大原则 | Quiz 知识检测 |
| `.gitlab-ci.yml` 配置 | Pipeline Builder 向导 |
| Deployment 配置 | Code Annotator 逐行解读 |
| 配置变更 | Config Diff Viewer 对比 |

### Stage 2: 多环境管理 (L2 进阶)

**核心**: Kustomize base/overlay + dev/staging/prod 差异化

| 学习内容 | 交互组件 |
|----------|----------|
| base/overlay 架构 | Mermaid 交互图 |
| 环境差异化配置 | K8s Manifest Generator |
| Sync Policy 策略 | Quiz 知识检测 |
| 多环境对比 | 环境参数对比表 |

### Stage 3: Canary 发布 (L3 生产)

**核心**: Argo Rollouts 渐进式发布 + 自动回滚

| 学习内容 | 交互组件 |
|----------|----------|
| Canary 发布原理 | Pipeline Simulator 动画 |
| Rollout 策略配置 | Quiz 知识检测 |
| AnalysisTemplate | Simulator 指标分析模拟 |
| 自动回滚 | Simulator 随机回滚演示 |

## 目录结构

```
cicd_easy/
├── website/                        # Docusaurus 交互式学习网站
│   ├── src/
│   │   ├── components/             # 交互组件
│   │   │   ├── PipelineBuilder/    # CI/CD Pipeline 向导
│   │   │   ├── K8sManifestGenerator/ # K8s 多环境配置向导
│   │   │   ├── PipelineSimulator/  # Pipeline + Canary 模拟器
│   │   │   ├── ConfigDiffViewer/   # 配置对比查看器
│   │   │   ├── CodeAnnotator/      # 代码逐行解读
│   │   │   └── Quiz/              # 知识检测
│   │   ├── css/                    # 全局样式
│   │   └── pages/                  # 首页
│   ├── docs/                       # 教学文档
│   │   ├── intro.md               # 欢迎
│   │   ├── getting-started.md     # 环境准备
│   │   ├── roadmap.md             # 学习路线图
│   │   ├── stage1/                # Stage 1 教学（4 篇）
│   │   ├── stage2/                # Stage 2 教学（3 篇）
│   │   ├── stage3/                # Stage 3 教学（3 篇）
│   │   ├── concepts/              # 核心概念（6 篇）
│   │   └── labs/                  # 实操练习（3 篇）
│   └── docusaurus.config.ts       # 站点配置
├── labs/                           # 实操资源文件
│   ├── stage1-static-deploy/      # Stage 1 K8s manifests + CI 配置
│   ├── stage2-multi-env/          # Stage 2 Kustomize base/overlay
│   └── stage3-canary/             # Stage 3 Rollout + Analysis
├── scripts/                        # 环境搭建脚本
│   ├── setup.sh                   # 增强版一键搭建
│   ├── setup-all.sh               # 基础版一键搭建
│   ├── install-kind.sh            # Kind 集群
│   ├── install-gitlab.sh          # GitLab CE
│   ├── install-argocd.sh          # Argo CD
│   ├── install-argo-rollouts.sh   # Argo Rollouts
│   └── register-runner.sh         # Runner 注册
├── docs/                           # 操作指南文档
└── .github/workflows/             # GitHub Pages 自动部署
```

## 学习路线图

按每天 2-3 小时计算，完成全部 Stage 约需 **7-10 天**。

| Stage | 名称 | 耗时 | 等级 | 核心收获 |
|-------|------|------|------|----------|
| Stage 1 | 静态部署 | 2-3 天 | **L1 入门** | GitOps 基本闭环 |
| Stage 2 | 多环境管理 | 2-3 天 | **L2 进阶** | Kustomize + 手动门控 |
| Stage 3 | Canary 发布 | 3-4 天 | **L3 生产** | 渐进式发布 + 自动回滚 |

**GitOps 成熟度等级**:
- **L1** — 自动化部署：Git Push 即部署，理解声明式配置
- **L2** — 环境管理：多环境隔离，手动门控保护生产
- **L3** — 渐进式发布：Canary 策略，业务指标分析，自动回滚

## 常见问题与排错

| 问题 | 可能原因 | 解决方法 |
|------|----------|----------|
| Docker 未运行 | Docker daemon 未启动 | `sudo systemctl start docker` 或打开 Docker Desktop |
| Kind 集群创建失败 | 端口 80/443 被占用 | 停止占用端口的进程 |
| GitLab 启动超时 | 内存不足（需 4GB+） | Docker Desktop → Memory ≥ 8GB |
| Argo CD 密码为空 | Pod 尚未全部就绪 | `kubectl get pods -n argocd` 确认后重试 |
| Pod 一直 Pending | 节点资源不足 | `kubectl describe pod <name>` 查看事件 |
| 镜像拉取失败 | Registry 未就绪 | 确认 GitLab Registry 在 5050 端口运行 |

```bash
# 常用调试命令
kubectl cluster-info                              # 集群状态
docker logs gitlab-ce --tail 100 -f                # GitLab 日志
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 -d       # Argo CD 密码
kubectl argo rollouts list rollouts                # Rollout 状态
./scripts/setup.sh --skip-infra                    # 重新运行（跳过已就绪组件）
```

## 技术栈

| 组件 | 用途 |
|------|------|
| [Docusaurus](https://docusaurus.io/) | 交互式学习网站框架 |
| [React + TypeScript](https://react.dev/) | 交互组件开发 |
| [Kind](https://kind.sigs.k8s.io/) | 本地 Kubernetes 集群 |
| [GitLab CE](https://about.gitlab.com/) | 代码托管 + CI/CD + Registry |
| [Argo CD](https://argoproj.github.io/argo-cd/) | GitOps 持续交付 |
| [Argo Rollouts](https://argoproj.github.io/argo-rollouts/) | Canary / Blue-Green 部署 |
| [Kustomize](https://kustomize.io/) | 多环境配置管理 |
| [Kaniko](https://github.com/GoogleContainerTools/kaniko) | 集群内镜像构建 |

## 参考资源

- [Argo CD 官方文档](https://argoproj.github.io/argo-cd/)
- [Argo Rollouts 官方文档](https://argoproj.github.io/argo-rollouts/)
- [GitLab CI 文档](https://docs.gitlab.com/ee/ci/)
- [Kustomize 文档](https://kustomize.io/)
- [OpenGitOps 原则](https://opengitops.dev/)

## License

MIT
