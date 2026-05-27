# 学习路线图

> 按每天 2-3 小时学习时间计算，完成全部 3 个 Stage 约需 7-10 天。

## 总览

| Stage | 名称 | 学习目标 | 预计耗时 | 核心概念 | 验收标准 | GitOps 成熟度 |
|-------|------|----------|----------|----------|----------|---------------|
| **Stage 1** | 静态页面自动部署 | 理解 GitOps 基础闭环：代码提交 → CI 构建 → 自动部署 | 2-3 天 | GitOps 原则、Argo CD Auto Sync、GitLab CI Pipeline、Kaniko 镜像构建 | 修改 HTML 后自动触发 CI，Argo CD 自动同步新版本到集群 | **L1 入门** |
| **Stage 2** | 多环境发布 | 掌握环境隔离与手动门控：dev/staging/prod 差异化管理 | 2-3 天 | Kustomize base/overlay、命名空间隔离、Manual Sync、CI when:manual | 3 套环境独立部署，prod 需手动确认后才上线 | **L2 进阶** |
| **Stage 3** | Canary 金丝雀发布 | 实现生产级渐进式发布与自动回滚 | 3-4 天 | Argo Rollouts、Canary 策略、AnalysisTemplate、自动回滚 | 新版本通过 20→40→60→100% 渐进发布，异常时自动回滚 | **L3 生产** |

---

## Stage 1: 静态页面自动部署（L1 入门）

### 学习目标

- 理解声明式配置与命令式操作的区别
- 掌握 GitOps 核心循环：Git Push → CI Build → Auto Deploy
- 学会使用 Argo CD Dashboard 监控应用状态

### 学习内容

| 序号 | 主题 | 时长 | 关键知识点 |
|------|------|------|------------|
| 1.1 | 环境搭建 | 2h | Kind 集群、GitLab CE、Argo CD 安装 |
| 1.2 | GitOps 概念 | 1h | 声明式 vs 命令式、Git 单一可信源 |
| 1.3 | GitLab CI Pipeline | 2h | `.gitlab-ci.yml` 结构、stages、Kaniko 构建 |
| 1.4 | Argo CD 基础 | 2h | Application CRD、Auto Sync、Sync Policy |
| 1.5 | 端到端实践 | 2h | 修改代码 → 观察 CI → 验证部署 |

### 验收标准

- [ ] Kind 集群 3 节点全部 Ready
- [ ] GitLab CI Pipeline 3 个 stage 绿色通过
- [ ] Argo CD Application 状态 `Synced` + `Healthy`
- [ ] 修改 `index.html` 后自动触发更新
- [ ] 能解释 push 到部署的完整数据流

---

## Stage 2: 多环境发布（L2 进阶）

### 学习目标

- 理解 Kustomize 的 base/overlay 模式
- 掌握多环境配置差异化管理
- 学会使用手动门控保护生产环境

### 学习内容

| 序号 | 主题 | 时长 | 关键知识点 |
|------|------|------|------------|
| 2.1 | Kustomize 基础 | 1.5h | base/overlay、patchesStrategicMerge、nameSuffix |
| 2.2 | 多环境 Overlay 设计 | 1.5h | 副本数差异、资源限制差异、环境变量注入 |
| 2.3 | 分支策略 | 1h | Git Flow、develop/main 分支、CI 触发规则 |
| 2.4 | Manual Sync | 1.5h | Argo CD 手动同步、when:manual 门控 |
| 2.5 | 端到端实践 | 2h | 全流程：dev 自动 → staging 自动 → prod 手动 |

### 验收标准

- [ ] `kubectl kustomize` 能正确渲染 3 套环境配置
- [ ] dev/staging/prod 部署在不同 namespace
- [ ] dev 自动部署，prod 需手动点击 CI Job
- [ ] prod Argo CD Application 使用 Manual Sync
- [ ] 能解释 Kustomize overlay 的覆盖机制

---

## Stage 3: Canary 金丝雀发布（L3 生产）

### 学习目标

- 理解 Canary 发布策略的原理和价值
- 掌握 Argo Rollouts 的渐进式发布
- 学会定义健康分析模板和自动回滚

### 学习内容

| 序号 | 主题 | 时长 | 关键知识点 |
|------|------|------|------------|
| 3.1 | 发布策略对比 | 1h | Rolling Update vs Canary vs Blue-Green |
| 3.2 | Argo Rollouts 基础 | 2h | Rollout CRD、Canary steps、setWeight/pause |
| 3.3 | AnalysisTemplate | 2h | Prometheus 指标、Web 检查、自定义分析 |
| 3.4 | 自动回滚 | 1.5h | abortScaleDown、failureLimit、回滚触发条件 |
| 3.5 | 端到端实践 | 2.5h | 触发 Canary → 观察渐进切换 → 模拟回滚 |

### 验收标准

- [ ] Rollout CRD 正确定义 4 步 Canary 策略
- [ ] 能观察 20% → 40% → 60% → 100% 渐进切换
- [ ] AnalysisTemplate 能检测异常并触发回滚
- [ ] 能手动 promote/abort 一个 Canary 发布
- [ ] 能解释 Canary 发布相比 Rolling Update 的优势

---

## GitOps 成熟度等级

### L1 入门 —— 自动化部署

```
开发者 → Git Push → CI 构建 → 自动部署到集群
```

- 理解 GitOps 基本原则
- 能使用 Argo CD Auto Sync
- 能编写基础 GitLab CI Pipeline

### L2 进阶 —— 环境管理

```
开发者 → Git Push → CI 构建 → 自动(dev/staging) + 手动(prod)
```

- 掌握 Kustomize 配置管理
- 理解环境隔离和手动门控
- 能设计多环境发布流程

### L3 生产 —— 渐进式发布

```
开发者 → Git Push → CI 构建 → Canary(20→40→60→100%) + 自动回滚
```

- 掌握 Argo Rollouts Canary 策略
- 能定义业务指标分析模板
- 能实现自动回滚保护机制

---

## 推荐学习顺序

```
Day 1-2:  环境搭建 + GitOps 概念阅读
Day 2-3:  Stage 1 实践 + 理解 Auto Sync
Day 4-5:  Kustomize 学习 + Stage 2 实践
Day 5-6:  Manual Sync 实践 + 分支策略理解
Day 7-8:  Argo Rollouts 学习 + Stage 3 实践
Day 9-10: Canary 模拟 + 自动回滚 + 整体回顾
```

## 延伸学习

| 方向 | 推荐资源 |
|------|----------|
| Argo CD 深入 | [官方文档](https://argoproj.github.io/argo-cd/) |
| Argo Rollouts | [官方文档](https://argoproj.github.io/argo-rollouts/) |
| Kustomize | [官方文档](https://kustomize.io/) |
| GitLab CI | [官方文档](https://docs.gitlab.com/ee/ci/) |
| GitOps 原则 | [OpenGitOps](https://opengitops.dev/) |
| Kubernetes | [官方文档](https://kubernetes.io/docs/) |
