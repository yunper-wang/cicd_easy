---
sidebar_position: 3
title: 实操引导
---

# Stage 3 实操引导

## 目标

完成 Canary 金丝雀发布的完整流程：配置发布策略、设置分析指标、触发发布、模拟故障并观察自动回滚。

## 前置条件

- Stage 1、Stage 2 已完成
- Argo Rollouts 已安装到集群
- Prometheus 监控系统运行正常
- `kubectl argo rollouts` 插件已安装

## Step 1: 安装 Argo Rollouts

如果尚未安装 Argo Rollouts：

```bash
# 创建 namespace
kubectl create namespace argo-rollouts

# 安装 Argo Rollouts 控制器
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# 验证安装
kubectl get pods -n argo-rollouts

# 安装 kubectl 插件
curl -LO https://github.com/argoproj/argo-rollouts/releases/latest/download/kubectl-argo-rollouts-linux-amd64
chmod +x ./kubectl-argo-rollouts-linux-amd64
sudo mv ./kubectl-argo-rollouts-linux-amd64 /usr/local/bin/kubectl-argo-rollouts
```

## Step 2: 配置 AnalysisTemplate

首先创建分析模板，定义 Canary 发布过程中的指标检查：

```yaml
# analysis-template.yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
  namespace: stage3
spec:
  metrics:
  - name: success-rate
    interval: 10s
    count: 3
    successCondition: result[0] >= 0.95
    failureLimit: 1
    provider:
      prometheus:
        query: |
          sum(rate(http_requests_total{
            namespace="stage3",
            status!~"5.."
          }[1m]))
          /
          sum(rate(http_requests_total{
            namespace="stage3"
          }[1m]))
```

部署 AnalysisTemplate：

```bash
kubectl apply -f analysis-template.yaml
```

## Step 3: 配置 Canary Rollout

创建 Rollout 资源，替代传统的 Deployment：

```yaml
# rollout.yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: stage3-app
  namespace: stage3
spec:
  replicas: 5
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app: stage3-app
  strategy:
    canary:
      canaryService: stage3-app-canary
      stableService: stage3-app-stable
      steps:
      - setWeight: 20
      - pause: {duration: 30s}
      - analysis:
          templates:
          - templateName: success-rate
      - setWeight: 40
      - pause: {duration: 30s}
      - analysis:
          templates:
          - templateName: success-rate
      - setWeight: 60
      - pause: {duration: 30s}
      - setWeight: 80
      - pause: {duration: 30s}
  template:
    metadata:
      labels:
        app: stage3-app
    spec:
      containers:
      - name: app
        image: registry.local/stage3-app:v1.0.0
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

创建对应的 Service 资源：

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: stage3-app-stable
  namespace: stage3
spec:
  selector:
    app: stage3-app
  ports:
    - port: 80
      targetPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: stage3-app-canary
  namespace: stage3
spec:
  selector:
    app: stage3-app
  ports:
    - port: 80
      targetPort: 80
```

部署所有资源：

```bash
kubectl create namespace stage3 --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f service.yaml
kubectl apply -f rollout.yaml
```

## Step 4: 验证初始部署

```bash
# 检查 Rollout 状态
kubectl argo rollouts get rollout stage3-app -n stage3

# 检查 Pod
kubectl get pods -n stage3

# 检查 Service
kubectl get svc -n stage3
```

预期输出：5 个稳定版本的 Pod 全部运行正常。

## Step 5: 触发 Canary 发布

更新镜像版本触发 Canary 发布：

```bash
# 方式 1: 通过 kubectl patch
kubectl patch rollout stage3-app -n stage3 \
  --type merge \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"app","image":"registry.local/stage3-app:v2.0.0"}]}}}}'

# 方式 2: 通过 argo rollouts CLI
kubectl argo rollouts set image stage3-app \
  app=registry.local/stage3-app:v2.0.0 -n stage3
```

## Step 6: 观察 Canary 进度

```bash
# 实时观察发布进度
kubectl argo rollouts get rollout stage3-app -n stage3 --watch
```

预期流程：

```
Name:            stage3-app
Namespace:       stage3
Status:          Progressing
Strategy:        Canary
  Step:          2/8
  SetWeight:     20
  ActualWeight:  20
Images:          registry.local/stage3-app:v1.0.0 (stable)
                 registry.local/stage3-app:v2.0.0 (canary)
Replicas:
  Desired:       5
  Current:       6
  Updated:       1
  Ready:         6
  Available:     6
```

观察要点：
- `SetWeight` — 当前的流量分配比例
- `Images` — 稳定版本和 canary 版本的镜像
- `Updated` — canary Pod 的数量
- `Step: 2/8` — 当前进度

## Step 7: 手动控制发布

在发布过程中，可以手动干预：

```bash
# 暂停发布（停在当前步骤）
kubectl argo rollouts pause stage3-app -n stage3

# 继续发布（推进到下一步骤）
kubectl argo rollouts promote stage3-app -n stage3

# 跳过剩余步骤，直接全量发布
kubectl argo rollouts promote stage3-app -n stage3 --full

# 中止发布（回滚到稳定版本）
kubectl argo rollouts abort stage3-app -n stage3
```

## Step 8: 模拟故障与自动回滚

模拟 AnalysisTemplate 检测到异常的场景：

### 设置故障场景

首先创建一个会导致分析失败的 AnalysisTemplate：

```yaml
# analysis-template-failure.yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate-strict
  namespace: stage3
spec:
  metrics:
  - name: success-rate
    interval: 5s
    count: 3
    successCondition: result[0] >= 0.99
    failureLimit: 0
    provider:
      prometheus:
        query: |
          sum(rate(http_requests_total{
            namespace="stage3",
            status!~"5.."
          }[1m]))
          /
          sum(rate(http_requests_total{
            namespace="stage3"
          }[1m]))
```

### 触发带有严格分析的发布

```bash
# 更新 AnalysisTemplate
kubectl apply -f analysis-template-failure.yaml

# 触发新版本发布
kubectl argo rollouts set image stage3-app \
  app=registry.local/stage3-app:v2.1.0 -n stage3

# 观察自动回滚过程
kubectl argo rollouts get rollout stage3-app -n stage3 --watch
```

### 观察回滚

当分析失败时，Argo Rollouts 会自动回滚：

```
Name:            stage3-app
Namespace:       stage3
Status:          Degraded
Message:         RolloutAborted: metric "success-rate" assessed Failed due to failureLimit
Strategy:        Canary
  Step:          0/8
  SetWeight:     0
  ActualWeight:  0
Images:          registry.local/stage3-app:v1.0.0 (stable)
Replicas:
  Desired:       5
  Current:       5
  Updated:       0
  Ready:         5
  Available:     5
```

注意：
- `Status: Degraded` — 表示发布失败
- `Message` — 失败原因（分析指标不满足条件）
- `Updated: 0` — canary Pod 已被清理
- `stable` 仍然是 `v1.0.0` — 成功回滚到稳定版本

## Step 9: 配置 Argo CD Application

将 Rollout 纳入 Argo CD 管理：

```bash
argocd app create stage3-app \
  --repo https://your-gitlab.local/cicd_easy.git \
  --path labs/stage3-canary \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace stage3
```

Argo CD 会自动识别 Rollout 资源，并在 Dashboard 中显示 Canary 进度。

## 完整的 Rollout YAML（参考）

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: stage3-app
  namespace: stage3
spec:
  replicas: 5
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app: stage3-app
  strategy:
    canary:
      canaryService: stage3-app-canary
      stableService: stage3-app-stable
      steps:
      - setWeight: 20
      - pause: {duration: 30s}
      - analysis:
          templates:
          - templateName: success-rate
      - setWeight: 40
      - pause: {duration: 30s}
      - analysis:
          templates:
          - templateName: success-rate
      - setWeight: 60
      - pause: {duration: 30s}
      - setWeight: 80
      - pause: {duration: 30s}
  template:
    metadata:
      labels:
        app: stage3-app
    spec:
      containers:
      - name: app
        image: registry.local/stage3-app:v1.0.0
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
        livenessProbe:
          httpGet:
            path: /healthz
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 80
          initialDelaySeconds: 3
          periodSeconds: 5
```

## 检查清单

- [ ] Argo Rollouts 控制器运行正常
- [ ] AnalysisTemplate 创建成功
- [ ] Rollout 资源创建成功（替代 Deployment）
- [ ] stable 和 canary Service 创建成功
- [ ] Canary 发布按步骤执行（20% -> 40% -> 60% -> 80% -> 100%）
- [ ] AnalysisTemplate 在发布过程中执行指标分析
- [ ] 模拟故障场景触发自动回滚
- [ ] 理解 promote、pause、abort 命令的效果
- [ ] 在 Argo CD Dashboard 中观察到 Canary 进度
