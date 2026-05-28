---
sidebar_position: 6
title: Kubernetes
---

# Kubernetes 基础

## 核心资源

| 资源 | 用途 |
|------|------|
| **Pod** | 最小调度单元，包含一个或多个容器 |
| **Deployment** | 管理 Pod 副本集，处理滚动更新 |
| **Service** | 为 Pod 提供稳定的网络端点 |
| **Namespace** | 资源隔离和配额管理 |
| **ConfigMap/Secret** | 配置和敏感信息管理 |

## 在 cicd_easy 中的使用

| Stage | K8s 资源 |
|-------|----------|
| Stage 1 | Deployment + Service |
| Stage 2 | Deployment + Service + Kustomize overlay |
| Stage 3 | Rollout + Service + AnalysisTemplate |

## Kind

Kind (Kubernetes in Docker) 用于在本地运行 K8s 集群，适合学习和开发环境。
