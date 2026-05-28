---
sidebar_position: 2
title: GitLab CI
---

# GitLab CI/CD

GitLab CI/CD 是 GitLab 内置的持续集成/持续交付工具。

## Pipeline 结构

```yaml
stages:          # 定义执行阶段
  - build
  - test
  - deploy

build-job:       # Job 名称
  stage: build   # 所属阶段
  script:        # 执行命令
    - echo "Building..."
  only:
    - main       # 触发条件
```

## 常用关键字

| 关键字 | 用途 |
|--------|------|
| `stages` | 定义阶段顺序 |
| `image` | 指定运行环境 |
| `script` | 执行的命令 |
| `artifacts` | Job 产出物 |
| `variables` | 自定义变量 |
| `only/except` | 触发条件 |
| `when` | 执行时机（manual/on_failure） |
