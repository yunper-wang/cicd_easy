---
title: Getting Started
---

# Getting Started

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Docker | ≥ 20.10 | [Official Docs](https://docs.docker.com/get-docker/) |
| kubectl | ≥ 1.29 | [Official Docs](https://kubernetes.io/docs/tasks/tools/) |
| helm | ≥ 3.12 | [Official Docs](https://helm.sh/docs/intro/install/) |
| git | ≥ 2.30 | System package manager |
| [Kind](https://kind.sigs.k8s.io/) | ≥ 0.20 | [Official Docs](https://kind.sigs.k8s.io/docs/user/quick-start/) |

**Recommended**: 4 CPU / 8GB RAM / 30GB Disk

## Setup

```bash
git clone https://github.com/yunper-wang/cicd_easy.git
cd cicd_easy

# Full setup (recommended for first time)
./scripts/setup.sh

# Or setup specific stages
./scripts/setup.sh --stage1
./scripts/setup.sh --stage2
./scripts/setup.sh --stage3
```

After setup, access:
- GitLab: http://localhost:8929
- Argo CD: https://localhost:8080
- Learning site: `cd website && npm start`
