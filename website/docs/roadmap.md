---
sidebar_position: 3
title: 学习路线图
---

# 学习路线图

## 路线概览

```mermaid
graph LR
    A[环境准备] --> B[Stage 1: 静态部署]
    B --> C[Stage 2: 多环境管理]
    C --> D[Stage 3: Canary 发布]
    D --> E[毕业! 生产级能力]
```

## 学习时间规划

建议学习周期：7-10 天（每天 2-3 小时）

### Day 1-2: Stage 1 — 静态部署

**目标**: 理解 GitOps 基本闭环

- [ ] 理解 Docker 镜像构建流程
- [ ] 掌握 `.gitlab-ci.yml` 基本语法
- [ ] 理解 Argo CD Application 配置
- [ ] 完成 Git Push → CI Build → CD Sync 全流程

**对应概念**: GitOps 四大原则、声明式配置、Git 单一可信源

### Day 3-5: Stage 2 — 多环境管理

**目标**: 掌握 Kustomize 多环境配置

- [ ] 理解 base/overlay 架构
- [ ] 配置 dev/staging/prod 差异化参数
- [ ] 掌握 Argo CD 多 Application 管理
- [ ] 理解 Sync Policy 对环境的影响

**对应概念**: Kustomize、环境隔离、配置复用

### Day 6-8: Stage 3 — Canary 发布

**目标**: 掌握渐进式交付

- [ ] 理解 Canary 发布原理
- [ ] 配置 Argo Rollouts 策略
- [ ] 设置 AnalysisTemplate 分析指标
- [ ] 掌握自动回滚机制

**对应概念**: 金丝雀发布、渐进式交付、自动分析

### Day 9-10: 综合实践

- [ ] 回顾全流程
- [ ] 完成所有实操练习
- [ ] 尝试自定义 Pipeline 配置

## 成熟度等级

| 等级 | 名称 | 对应 Stage | 能力 |
|------|------|-----------|------|
| L1 | 初学者 | Stage 1 | 能完成基本的 CI/CD Pipeline 配置 |
| L2 | 实践者 | Stage 2 | 能管理多环境、理解配置复用 |
| L3 | 专家 | Stage 3 | 能设计渐进式发布策略、处理回滚 |
