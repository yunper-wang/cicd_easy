---
sidebar_position: 2
title: Rollout 配置
---

# Argo Rollouts 配置详解

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

## 配置交互

使用 **Pipeline Builder (高级模式)** 练习 Canary 配置：

- 拖拽设置 Canary 步骤
- 配置每步的流量权重和暂停时间
- 设置 AnalysisTemplate 指标和阈值
- 实时预览生成的 rollout.yaml

下一步: [实操引导](./hands-on)
