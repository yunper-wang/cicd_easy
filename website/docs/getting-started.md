---
sidebar_position: 2
title: 环境准备
---

# 环境准备与快速开始

## 前置条件

| 工具 | 版本要求 | 说明 |
|------|----------|------|
| Docker | ≥ 20.10 | 容器运行时 |
| Kind | ≥ 0.20 | 本地 Kubernetes 集群 |
| kubectl | ≥ 1.28 | K8s 命令行工具 |
| Git | ≥ 2.30 | 版本控制 |
| Helm | ≥ 3.12 | 包管理器（Argo CD 安装） |

## 一键搭建

使用项目提供的 `setup.sh` 脚本，自动完成所有环境搭建：

```bash
# 克隆项目
git clone https://github.com/yunper-wang/cicd_easy.git
cd cicd_easy

# 赋予执行权限
chmod +x scripts/setup.sh

# 一键搭建（包含 GitLab + Argo CD + Argo Rollouts）
./scripts/setup.sh
```

## 手动搭建

如果需要分步搭建，参考以下命令：

```bash
# 1. 创建 Kind 集群
kind create cluster --name cicd-cluster --config scripts/kind-config.yaml

# 2. 安装 GitLab CE
helm repo add gitlab https://charts.gitlab.io/
helm install gitlab gitlab/gitlab -n gitlab --create-namespace

# 3. 安装 Argo CD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 4. 安装 Argo Rollouts
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://raw.githubusercontent.com/argoproj/argo-rollouts/stable/manifests/install.yaml
```

## 验证环境

```bash
# 检查集群状态
kubectl get nodes

# 检查 GitLab 状态
kubectl get pods -n gitlab

# 检查 Argo CD 状态
kubectl get pods -n argocd

# 获取 Argo CD 登录密码
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

环境就绪后，前往 [Stage 1: 静态部署](./stage1/concepts) 开始学习。
