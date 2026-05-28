---
sidebar_position: 2
title: Pipeline 配置
---

# Pipeline 配置详解

## .gitlab-ci.yml 结构

Stage 1 的 CI/CD Pipeline 包含三个阶段：构建、测试、部署。

```yaml
stages:
  - build
  - test
  - deploy

build-image:
  stage: build
  image:
    name: gcr.io/kaniko-project/executor:debug
    entrypoint: [""]
  script:
    - /kaniko/executor
      --dockerfile=Dockerfile
      --context=.
      --destination=$CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  only:
    - main
```

## 关键字段解读

| 字段 | 含义 |
|------|------|
| `stages` | 定义 Pipeline 的执行阶段顺序 |
| `image` | 指定 Job 运行的容器镜像 |
| `script` | Job 执行的具体命令 |
| `only` | 触发条件，仅在 main 分支运行 |
| `$CI_REGISTRY_IMAGE` | GitLab 内置变量，指向 Container Registry |
| `$CI_COMMIT_SHORT_SHA` | Git 提交的短哈希值，用作镜像标签 |

## 配置交互

使用下方的 **Pipeline Builder** 练习配置你自己的 Pipeline：

- 选择构建方式（Kaniko / Docker Build）
- 配置镜像名和标签策略
- 设置触发规则
- 实时预览生成的 `.gitlab-ci.yml`

下一步: [配置对比](./config-diff)
