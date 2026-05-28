---
sidebar_position: 2
title: Kustomize 配置
---

# Kustomize 配置详解

## base/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
namespace: stage2
commonLabels:
  app.kubernetes.io/part-of: stage2-multi-env
```

## overlay/dev/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - target:
      kind: Deployment
    patch: |
      - op: replace
        path: /spec/replicas
        value: 1
      - op: replace
        path: /spec/template/spec/containers/0/image
        value: registry.local/stage2-app:dev-latest
namespace: stage2-dev
```

## overlay/prod/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - target:
      kind: Deployment
    patch: |
      - op: replace
        path: /spec/replicas
        value: 3
      - op: replace
        path: /spec/template/spec/containers/0/image
        value: registry.local/stage2-app:v1.0.0
namespace: stage2-prod
```

## 配置交互

使用 **K8s Manifest Generator** 练习多环境配置：

- 选择目标环境（dev / staging / prod）
- 调整差异化参数（replicas、image、resources）
- 实时预览生成的 kustomization.yaml

下一步: [实操引导](./hands-on)
