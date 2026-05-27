#!/usr/bin/env bash
# setup-all.sh — 一键搭建 CI/CD GitOps 练手环境
# 用法: ./scripts/setup-all.sh [--skip-kind] [--skip-gitlab] [--skip-argocd]
# 最低要求: Docker 20.10+, 8GB RAM, 4 cores

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/tmp/cicd-easy-setup-$(date +%Y%m%d-%H%M%S).log"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC} $*" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*" | tee -a "$LOG_FILE"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_FILE"; }

# 解析参数
SKIP_KIND=false; SKIP_GITLAB=false; SKIP_ARGOCD=false; SKIP_ROLLOUTS=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-kind)      SKIP_KIND=true; shift ;;
    --skip-gitlab)    SKIP_GITLAB=true; shift ;;
    --skip-argocd)    SKIP_ARGOCD=true; shift ;;
    --skip-rollouts)  SKIP_ROLLOUTS=true; shift ;;
    -h|--help) echo "Usage: $0 [--skip-kind] [--skip-gitlab] [--skip-argocd] [--skip-rollouts]"; exit 0 ;;
    *) err "Unknown option: $1"; exit 1 ;;
  esac
done

log "=== CI/CD GitOps 练手环境搭建 ==="
log "日志文件: $LOG_FILE"

# 前置检查
check_prerequisites() {
  log "检查前置条件..."
  command -v docker >/dev/null 2>&1 || { err "需要 Docker (20.10+)"; exit 1; }
  docker info >/dev/null 2>&1 || { err "Docker 未运行"; exit 1; }

  local docker_mem_mb
  docker_mem_mb=$(docker info 2>/dev/null | grep "Total Memory" | awk '{print $3}' | sed 's/GiB//')
  # 不强制退出，仅警告
  if command -v bc >/dev/null 2>&1; then
    if [[ $(echo "$docker_mem_mb < 6" | bc 2>/dev/null) -eq 1 ]]; then
      warn "Docker 内存不足 6GB，建议至少 8GB。当前: ${docker_mem_mb}GB"
    fi
  fi
  log "前置条件检查通过"
}

# Step 1: Kind 集群
setup_kind() {
  if [[ "$SKIP_KIND" == true ]]; then warn "跳过 Kind 安装"; return; fi
  log "--- Step 1/5: 创建 Kind 集群 ---"
  bash "${SCRIPT_DIR}/install-kind.sh"
  log "Kind 集群就绪"
}

# Step 2: GitLab CE
setup_gitlab() {
  if [[ "$SKIP_GITLAB" == true ]]; then warn "跳过 GitLab 安装"; return; fi
  log "--- Step 2/5: 部署 GitLab CE ---"
  bash "${SCRIPT_DIR}/install-gitlab.sh"
  log "GitLab CE 就绪"
}

# Step 3: Argo CD
setup_argocd() {
  if [[ "$SKIP_ARGOCD" == true ]]; then warn "跳过 Argo CD 安装"; return; fi
  log "--- Step 3/5: 安装 Argo CD ---"
  bash "${SCRIPT_DIR}/install-argocd.sh"
  log "Argo CD 就绪"
}

# Step 4: Argo Rollouts (Stage 3 需要)
setup_rollouts() {
  if [[ "$SKIP_ROLLOUTS" == true ]]; then warn "跳过 Argo Rollouts 安装"; return; fi
  log "--- Step 4/5: 安装 Argo Rollouts ---"
  bash "${SCRIPT_DIR}/install-argo-rollouts.sh"
  log "Argo Rollouts 就绪"
}

# Step 5: GitLab Runner 注册
setup_runner() {
  if [[ "$SKIP_GITLAB" == true ]]; then warn "跳过 Runner 注册（依赖 GitLab）"; return; fi
  log "--- Step 5/5: 注册 GitLab Runner ---"
  bash "${SCRIPT_DIR}/register-runner.sh"
  log "GitLab Runner 已注册"
}

# 执行
check_prerequisites
setup_kind
setup_gitlab
setup_argocd
setup_rollouts
setup_runner

log ""
log "=== 搭建完成 ==="
log "验证命令:"
log "  kubectl cluster-info"
log "  kubectl get pods -n argocd"
log "  kubectl get pods -n gitlab"
log ""
log "Argo CD 访问: kubectl port-forward svc/argocd-server -n argocd 8080:443"
log "Argo CD 密码: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d"
log "GitLab 访问: http://localhost:8929 (root/5iveL!fe)"
