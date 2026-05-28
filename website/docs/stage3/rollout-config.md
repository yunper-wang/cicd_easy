---
sidebar_position: 2
title: Rollout 配置
---

# Argo Rollouts 配置详解

import PipelineSimulator from '@site/src/components/PipelineSimulator';
import Quiz from '@site/src/components/Quiz';

## rollout.yaml 核心结构

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: stage3-app
spec:
  replicas: 3
  strategy:
    canary:
      steps:
      - setWeight: 20
      - pause: {duration: 30s}
      - setWeight: 40
      - pause: {duration: 30s}
      - setWeight: 60
      - pause: {duration: 30s}
      - setWeight: 80
      - pause: {duration: 30s}
      analysis:
        templates:
        - templateName: success-rate
```

## AnalysisTemplate 配置

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  metrics:
  - name: success-rate
    interval: 10s
    count: 3
    successCondition: result[0] >= 0.95
    provider:
      prometheus:
        query: |
          sum(rate(http_requests_total{status!~"5.."}[1m]))
          /
          sum(rate(http_requests_total[1m]))
```

## 发布流程模拟

使用下方的 **Pipeline Simulator** 模拟 CI/CD Pipeline 和 Canary 发布流程：

<PipelineSimulator />

## Stage 3 知识检测

<Quiz
  title="Stage 3: Canary 发布"
  questions={[
    {
      question: "Canary 发布与滚动更新(rolling update)的最大区别是什么？",
      options: [
        "Canary 使用 Pod 替代 Deployment",
        "Canary 可以精确控制流量百分比并暂停发布",
        "Canary 不需要 Kubernetes 集群",
        "Canary 只能用于蓝绿部署"
      ],
      correctIndex: 1,
      explanation: "Canary 发布的核心优势是精确的流量控制和可暂停的发布过程。滚动更新自动替换 Pod，而 Canary 可以按百分比逐步切流量，并在每个步骤暂停观察。"
    },
    {
      question: "Argo Rollouts 中 AnalysisTemplate 的作用是什么？",
      options: [
        "定义构建步骤",
        "在发布过程中自动分析指标以决定继续或回滚",
        "配置 Git 仓库地址",
        "管理 Docker 镜像标签"
      ],
      correctIndex: 1,
      explanation: "AnalysisTemplate 定义了在 Canary 发布过程中执行的指标分析。它可以查询 Prometheus 等监控系统的数据，根据成功/失败条件自动决定继续推进还是回滚。"
    },
    {
      question: "在下面的 rollout 配置中，发布到 40% 流量后会怎样？",
      options: [
        "立即继续到 60%",
        "暂停 30 秒等待观察",
        "自动回滚",
        "发送通知给管理员"
      ],
      correctIndex: 1,
      explanation: "pause: {duration: 30s} 表示在当前流量权重下暂停指定时间。这给监控系统足够时间收集指标，判断新版本是否健康。"
    },
    {
      question: "kubectl argo rollouts abort 命令的效果是什么？",
      options: [
        "暂停发布",
        "将应用回滚到上一个稳定版本",
        "删除 Rollout 资源",
        "重新开始发布"
      ],
      correctIndex: 1,
      explanation: "abort 命令会立即中止 Canary 发布，并将应用回滚到上一个稳定的 ReplicaSet。与 pause 不同，pause 只是暂停推进，而 abort 是主动回滚。"
    }
  ]}
/>

下一步: [实操引导](./hands-on)
