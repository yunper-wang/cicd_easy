# Stage 1: 静态页面自动部署

## 流程概览

```mermaid
flowchart LR
    A[开发者编辑代码] --> B[git push]
    B --> C[GitLab CI Trigger]
    C --> D[Kaniko 构建镜像]
    D --> E[推送到 Registry]
    E --> F[CI 更新 deployment.yaml]
    F --> G[git push manifest]
    G --> H[Argo CD 检测变更]
    H --> I[Auto Sync 到 K8s]
    I --> J[Pod 滚动更新]

    style A fill:#4CAF50,color:#fff
    style H fill:#FF9800,color:#fff
    style J fill:#2196F3,color:#fff
```

---

## 一、前置条件

| 项目 | 要求 | 验证命令 |
|------|------|----------|
| Kind 集群 | 已创建，3 节点 Ready | `kubectl get nodes` |
| GitLab CE | 已启动，健康检查通过 | `curl http://localhost:8929/-/health` |
| Argo CD | 已安装，Pod Running | `kubectl get pods -n argocd` |
| GitLab Runner | 已注册，状态在线 | GitLab UI → Admin → Runners |
| Git 仓库 | 已创建 `cicd-demo` 项目 | `git remote -v` |

### 环境准备脚本

如果尚未完成环境搭建，执行一键安装：

```bash
# 一键搭建所有基础设施
./scripts/setup-all.sh

# 或逐步安装
./scripts/install-kind.sh      # Step 1: Kind 集群
./scripts/install-gitlab.sh    # Step 2: GitLab CE
./scripts/install-argocd.sh    # Step 3: Argo CD
./scripts/install-argo-rollouts.sh  # Step 4: Argo Rollouts（Stage 3 需要）
./scripts/register-runner.sh   # Step 5: 注册 Runner
```

---

## 二、操作步骤

### Step 1: 创建 GitLab 项目

```bash
# 1. 打开浏览器访问 GitLab
#    URL: http://localhost:8929
#    用户名: root
#    密码: docker exec -it gitlab-ce grep 'Password:' /etc/gitlab/initial_root_password

# 2. 创建新项目
#    点击 "+" → "New project" → "Create blank project"
#    项目名: cicd-demo
#    Visibility: Public（方便演示）

# 3. 克隆项目到本地
git clone http://localhost:8929/root/cicd-demo.git
cd cicd-demo
```

### Step 2: 推送 Stage 1 代码

```bash
# 将 stage1-static-deploy 目录复制到项目中
cp -r /path/to/cicd_easy/stage1-static-deploy/ .

# 推送到 GitLab
git add .
git commit -m "feat: add stage1 static deploy"
git push origin main
```

### Step 3: 在 Argo CD 中创建 Application

```bash
# 方式 1: 通过 kubectl apply（推荐）
kubectl apply -f stage1-static-deploy/k8s/argocd-app.yaml

# 方式 2: 通过 Argo CD CLI
argocd app create stage1-app \
  --repo http://gitlab.local:8929/root/cicd-demo.git \
  --path stage1-static-deploy/k8s \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --sync-policy automated \
  --auto-prune \
  --self-heal
```

### Step 4: 观察自动部署

```bash
# Argo CD 会在检测到 Git 变更后自动同步
# 查看同步状态
argocd app get stage1-app

# 查看 Pod 状态
kubectl get pods -l app=stage1-app

# 查看 Deployment 事件
kubectl describe deployment stage1-app
```

### Step 5: 验证部署结果

```bash
# Port-Forward 访问应用
kubectl port-forward svc/stage1-svc 8080:80

# 在另一个终端访问
curl http://localhost:8080
# 应该看到 "CI/CD GitOps Demo - Stage 1" 页面
```

### Step 6: 触发自动更新

```bash
# 修改 index.html 中的版本号
sed -i 's/Version: v1.0.0/Version: v1.1.0/' stage1-static-deploy/index.html

# 推送变更
git add .
git commit -m "feat: update to v1.1.0"
git push origin main

# 观察 CI Pipeline
# 1. GitLab CI 自动触发 build
# 2. Kaniko 构建新镜像并推送
# 3. CI 更新 deployment.yaml 中的镜像 tag
# 4. Argo CD 检测到 Git 变更，自动同步

# 监控滚动更新
kubectl rollout status deployment/stage1-app
```

---

## 三、预期结果

| 检查项 | 预期状态 |
|--------|----------|
| GitLab CI Pipeline | 3 个 stage 均为绿色（build → publish → deploy） |
| Argo CD Application | `Synced` + `Healthy` |
| K8s Pods | 2 个 Running Pod（replicas: 2） |
| 页面访问 | 显示 "Stage 1 - Static Auto Deploy" |
| 更新后 | 版本号从 v1.0.0 变为 v1.1.0 |

---

## 四、验证命令

```bash
# 1. 检查 Argo CD 同步状态
argocd app list
# 预期: stage1-app | Synced | Healthy

# 2. 检查 Pod 状态
kubectl get pods -l app=stage1-app
# 预期: 2/2 Running

# 3. 检查 Service
kubectl get svc stage1-svc
# 预期: ClusterIP 80/TCP

# 4. 检查镜像版本
kubectl get deployment stage1-app -o jsonpath='{.spec.template.spec.containers[0].image}'
# 预期: gitlab.local:5050/root/cicd-demo/stage1:<commit-sha>

# 5. 访问应用
kubectl port-forward svc/stage1-svc 8080:80
curl http://localhost:8080
# 预期: HTML 页面内容

# 6. 检查 Argo CD 日志
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server --tail=20
```

---

## 常见问题排查

| 问题 | 原因 | 解决方法 |
|------|------|----------|
| CI Pipeline 不触发 | Runner 未注册或不在线 | 检查 GitLab → Admin → Runners |
| 镜像构建失败 | Registry 未启用或网络不通 | 确认 `docker exec gitlab-ce gitlab-ctl status` |
| Argo CD 显示 `Unknown` | repoURL 不可达 | 检查 `http://gitlab.local:8929` 可访问性 |
| Pod ImagePullBackOff | 镜像地址错误或 secret 缺失 | 检查 `imagePullSecrets` 配置 |
| 修改未自动同步 | selfHeal 未开启 | 检查 argocd-app.yaml 的 syncPolicy |
