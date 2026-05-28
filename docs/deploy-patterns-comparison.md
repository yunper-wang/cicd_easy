# 部署模式对比：传统 Docker 部署 vs Kubernetes GitOps

> 本文对比两种主流 CI/CD 部署模式，帮助理解为什么本项目选择 Kubernetes GitOps 方案。

## 架构总览对比

### 传统 Docker 部署

```
开发者 → GitLab CI → Docker Build → SSH → 服务器 docker-compose up
                                      ↓
                            Nginx 反向代理 + SSL
                            健康检查（HTTP 状态码）
                            数据库迁移（容器内执行）
```

### Kubernetes GitOps（本项目）

```
开发者 → GitLab CI → Kaniko Build → Git Manifest 更新
                                      ↓
                            Argo CD 检测 Git 变更
                                      ↓
                            Auto/Manual Sync → K8s Pod
                                      ↓
                            Canary 渐进式发布（Argo Rollouts）
```

---

## 5 维度详细对比

### 1. 构建策略

| 维度 | 传统 Docker 部署 | Kubernetes GitOps |
|------|-----------------|------------------|
| 构建工具 | Docker CLI / Docker Socket | Kaniko（集群内） |
| 需要 Docker daemon | 是 | 否 |
| 安全风险 | Docker Socket 挂载有特权风险 | Kaniko 无特权运行 |
| 缓存机制 | Docker layer cache | Kaniko remote cache |
| 适用环境 | 任何有 Docker 的机器 | Kubernetes 集群内 |

**传统方案 Dockerfile 示例**（多阶段构建）：

```dockerfile
# 构建阶段
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 运行阶段
FROM node:18-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /app/dist ./dist
USER appuser
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

**本项目方案**：

```dockerfile
# 简单 Nginx 静态页面
FROM nginx:1.25-alpine
COPY index.html /usr/share/nginx/html/
EXPOSE 80
```

---

### 2. 多环境管理

| 维度 | 传统方案 | GitOps 方案 |
|------|---------|------------|
| 环境隔离 | 不同服务器 / 不同端口 | K8s namespace 隔离 |
| 配置管理 | .env 文件 + CI 变量 | Kustomize overlay |
| 环境差异 | 独立 build 任务 | 同一镜像 + 不同 overlay |
| 回滚方式 | 重新部署旧镜像 | `git revert` + Argo CD sync |

**传统方案环境管理**：

```yaml
# 通过 CI 变量区分环境
deploy_dev:
  script:
    - ssh ${DEV_HOST} "docker-compose up -d"
  only:
    refs: [develop]

deploy_prod:
  script:
    - ssh ${PROD_HOST} "docker-compose up -d"
  when: manual
  only:
    refs: [main]
```

**本项目方案**：

```
k8s/
├── base/                    # 共享配置
│   ├── deployment.yaml
│   └── service.yaml
└── overlays/
    ├── dev/                 # 1 replica, 100m CPU
    ├── staging/             # 2 replicas, 200m CPU
    └── prod/                # 3 replicas, 500m CPU, manual sync
```

---

### 3. 部署策略

| 维度 | 传统方案 | GitOps 方案 |
|------|---------|------------|
| 部署方式 | docker-compose up -d | Argo CD Sync / Argo Rollouts |
| 流量切分 | 不支持 | Canary 20%→40%→60%→100% |
| 自动回滚 | 手动回滚 | AnalysisTemplate 自动检测 + 回滚 |
| 健康检查 | Shell HTTP 状态检查 | K8s readiness/liveness probe |

**传统方案健康检查**（deploy.sh 片段）：

```bash
# HTTP 状态检查
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}/health)
if [ "$HTTP_CODE" != "200" ]; then
  echo "Health check failed: HTTP $HTTP_CODE"
  # 回滚逻辑
  docker pull ${PREVIOUS_IMAGE}
  docker-compose up -d
  exit 1
fi
```

**本项目方案**（Argo Rollouts Canary）：

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
spec:
  strategy:
    canary:
      steps:
        - setWeight: 20
        - pause: { duration: 5m }
        - setWeight: 40
        - pause: { duration: 5m }
        - analysis:
            templates:
              - templateName: success-rate
```

---

### 4. 配置与密钥管理

| 维度 | 传统方案 | GitOps 方案 |
|------|---------|------------|
| 环境变量 | .env 文件（服务器上） | ConfigMap / Secret |
| CI 变量注入 | GitLab API 管理 CI/CD Variables | Kustomize secretGenerator |
| 密钥安全 | 服务器文件权限 | K8s Secret（base64 + RBAC） |
| 变量类型 | 普通变量 + 文件类型变量 | ConfigMap + Secret |

**传统方案变量注入**（generate-env.sh 模式）：

```bash
# CI 中使用 GitLab 文件类型变量
if [ -n "$ENV_FILE_CONTENT" ]; then
  echo "$ENV_FILE_CONTENT" > .env
else
  cp .env.example .env
fi
```

**本项目方案**：

```yaml
# Kustomize secretGenerator
secretGenerator:
  - name: app-config
    literals:
      - DATABASE_URL=postgresql://...
```

---

### 5. 基础设施要求

| 维度 | 传统方案 | GitOps 方案 |
|------|---------|------------|
| 最低要求 | 一台 Linux 服务器 + Docker | K8s 集群（Kind 可本地） |
| 额外组件 | Nginx, acme.sh | Argo CD, Argo Rollouts |
| SSL 证书 | acme.sh + Let's Encrypt | K8s Ingress + cert-manager |
| 数据库管理 | deploy.sh 自动创建 DB | K8s StatefulSet / 外部托管 |
| 学习曲线 | 较低（Docker 基础） | 较高（K8s + GitOps 概念） |

---

## 选择建议

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| 个人项目 / 小团队（1-3 人） | 传统 Docker | 简单，服务器成本低 |
| 中型团队（3-10 人） | GitOps | 环境一致性，可审计 |
| 大型团队 / 微服务 | GitOps + Argo Rollouts | 流量切分，自动回滚，多环境 |
| 学习 K8s / DevOps | GitOps（本项目） | 渐进式学习，从入门到生产 |

> **核心差异**：传统方案是"命令式"的（告诉服务器做什么），GitOps 是"声明式"的（描述期望状态，系统自动收敛）。GitOps 将运维操作编码为 Git 提交，天然具备可审计、可回滚、可复现的特性。
