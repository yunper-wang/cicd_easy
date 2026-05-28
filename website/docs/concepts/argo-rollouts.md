---
sidebar_position: 4
title: Argo Rollouts
---

# Argo Rollouts

Argo Rollouts 是 Argo CD 生态的渐进式交付控制器。

## 与 Deployment 的关系

Rollout 是 Deployment 的替代资源，兼容 Deployment API 但扩展了发布策略：

| 特性 | Deployment | Rollout |
|------|-----------|---------|
| 策略 | RollingUpdate / Recreate | RollingUpdate / Canary / BlueGreen |
| 流量控制 | 无 | 精确百分比 |
| 自动分析 | 无 | AnalysisTemplate |
| 暂停/继续 | 不支持 | 支持 |
| 回滚 | `kubectl rollout undo` | 自动 + 手动 |

## Canary 策略示例

```yaml
spec:
  strategy:
    canary:
      steps:
      - setWeight: 20
      - pause: {duration: 30s}
      - setWeight: 40
      - pause: {}
      - setWeight: 100
```
