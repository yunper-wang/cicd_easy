---
sidebar_position: 2
title: Pipeline 配置
---

# Pipeline 配置详解

import PipelineBuilder from '@site/src/components/PipelineBuilder';
import CodeAnnotator from '@site/src/components/CodeAnnotator';

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

<CodeAnnotator
  code={`stages:
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
    - main`}
  annotations={[
    {line: 1, text: "stages 定义了 Pipeline 的执行阶段顺序。GitLab 按此顺序依次执行每个阶段中的 Job。"},
    {line: 5, text: "build-image 是 Job 名称，你可以自定义。GitLab 会根据 stage 字段将其分配到对应阶段。"},
    {line: 7, text: "image 指定运行此 Job 的 Docker 镜像。这里使用 Kaniko executor，它可以在不需要 Docker daemon 的情况下构建镜像。"},
    {line: 11, text: "script 是 Job 的核心——定义实际要执行的命令。Kaniko 的 executor 命令负责构建和推送镜像。"},
    {line: 15, text: "only 限制此 Job 仅在 main 分支上触发。这意味着只有合并到 main 的代码才会触发构建。"},
    {line: 17, text: "$CI_REGISTRY_IMAGE 和 $CI_COMMIT_SHORT_SHA 是 GitLab 内置变量，分别代表 Registry 地址和提交短哈希。"}
  ]}
  title=".gitlab-ci.yml 字段解读"
/>

## 交互式 Pipeline Builder

使用下方的 **Pipeline Builder** 练习配置你自己的 CI/CD Pipeline：

<PipelineBuilder />

下一步: [配置对比](./config-diff)
