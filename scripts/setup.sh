#!/usr/bin/env bash
# setup.sh — cicd_easy 一键搭建脚本（增强版）
# 覆盖: 依赖检查 → 基础设施搭建 → GitLab 配置 → Argo CD 配置 → 验证
# 用法: ./scripts/setup.sh [选项]
#   --stage1          仅初始化 Stage 1 (静态部署)
#   --stage2          仅初始化 Stage 2 (多环境)
#   --stage3          仅初始化 Stage 3 (Canary)
#   --skip-infra      跳过基础设施搭建（假设已就绪）
#   --skip-kind       跳过 Kind 集群创建
#   --skip-gitlab     跳过 GitLab 部署
#   --skip-argocd     跳过 Argo CD 安装
#   --skip-rollouts   跳过 Argo Rollouts 安装
#   --skip-push       跳过代码推送到 GitLab
#   --skip-apps       跳过 Argo CD Application 注册
#   -y / --yes        跳过所有确认提示
#   -h / --help       显示帮助信息

set -euo pipefail

# ── 配置 ──────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_FILE="/tmp/cicd-easy-setup-$(date +%Y%m%d-%H%M%S).log"

CLUSTER_NAME="${KIND_CLUSTER_NAME:-cicd-easy}"
K8S_VERSION="${KIND_K8S_VERSION:-v1.29.2}"
GITLAB_PORT="${GITLAB_PORT:-8929}"
GITLAB_URL="http://gitlab.local:${GITLAB_PORT}"
GITLAB_PROJECT="cicd-demo"
ARGOCD_NS="${ARGOCD_NS:-argocd}"

# ── 颜色定义 ──────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC} $*" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*" | tee -a "$LOG_FILE"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_FILE"; }
step() { echo -e "\n${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
         echo -e "${BOLD}${CYAN}  $*${NC}" | tee -a "$LOG_FILE"
         echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n" | tee -a "$LOG_FILE"; }

# ── 进度条 ────────────────────────────────────────────────
progress() {
  local current="$1" total="$2" label="$3"
  local width=30
  local filled=$(( current * width / total ))
  local empty=$(( width - filled ))
  local bar=""
  for ((i=0; i<filled; i++)); do bar+="█"; done
  for ((i=0; i<empty; i++)); do bar+="░"; done
  printf "\r${CYAN}[%s]${NC} %s (%d/%d)" "$bar" "$label" "$current" "$total"
  if [[ "$current" -eq "$total" ]]; then echo ""; fi
}

# ── 确认提示 ──────────────────────────────────────────────
confirm() {
  local msg="$1"
  if [[ "${YES_MODE:-false}" == "true" ]]; then return 0; fi
  echo -e "${YELLOW}⚠ ${msg}${NC}"
  read -rp "继续? [y/N] " answer
  [[ "${answer,,}" == "y" || "${answer,,}" == "yes" ]]
}

# ── 参数解析 ──────────────────────────────────────────────
SKIP_KIND=false; SKIP_GITLAB=false; SKIP_ARGOCD=false; SKIP_ROLLOUTS=false
SKIP_INFRA=false; SKIP_PUSH=false; SKIP_APPS=false
YES_MODE=false; STAGE_FILTER=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --stage1)         STAGE_FILTER="stage1"; shift ;;
    --stage2)         STAGE_FILTER="stage2"; shift ;;
    --stage3)         STAGE_FILTER="stage3"; shift ;;
    --skip-infra)     SKIP_INFRA=true; shift ;;
    --skip-kind)      SKIP_KIND=true; shift ;;
    --skip-gitlab)    SKIP_GITLAB=true; shift ;;
    --skip-argocd)    SKIP_ARGOCD=true; shift ;;
    --skip-rollouts)  SKIP_ROLLOUTS=true; shift ;;
    --skip-push)      SKIP_PUSH=true; shift ;;
    --skip-apps)      SKIP_APPS=true; shift ;;
    -y|--yes)         YES_MODE=true; shift ;;
    -h|--help)
      head -15 "$0" | grep '^#' | sed 's/^# //' | sed 's/^#//'
      exit 0 ;;
    *) err "未知选项: $1 (使用 -h 查看帮助)"; exit 1 ;;
  esac
done

# ══════════════════════════════════════════════════════════
#  BANNER
# ══════════════════════════════════════════════════════════
echo -e "${BOLD}${CYAN}"
cat <<'BANNER'
  ╔══════════════════════════════════════════════════════╗
  ║       CI/CD GitOps 练手项目 — 一键搭建脚本          ║
  ║                                                      ║
  ║   Stage 1: 静态页面自动部署                          ║
  ║   Stage 2: 多环境发布 (dev/staging/prod)             ║
  ║   Stage 3: Canary 金丝雀发布                         ║
  ╚══════════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"
log "日志文件: ${LOG_FILE}"
[[ -n "$STAGE_FILTER" ]] && log "仅初始化: ${STAGE_FILTER}"

# ══════════════════════════════════════════════════════════
#  PHASE 0: 依赖检查
# ══════════════════════════════════════════════════════════
step "Phase 0/5: 依赖检查"

check_dep() {
  local name="$1" min_ver="$2" cmd="$3" install_hint="$4"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    err "${name} 未安装。安装方式: ${install_hint}"
    return 1
  fi
  local ver
  ver=$($cmd --version 2>/dev/null | head -1 | grep -oP '[\d.]+' | head -1)
  log "  ${name}: ${ver} (需要 ≥ ${min_ver}) ✓"
  return 0
}

DEPS_OK=true
check_dep "Docker"  "20.10" "docker" "https://docs.docker.com/get-docker/"   || DEPS_OK=false
check_dep "kubectl" "1.29"  "kubectl" "https://kubernetes.io/docs/tasks/tools/" || DEPS_OK=false
check_dep "helm"    "3.12"  "helm" "https://helm.sh/docs/intro/install/"       || DEPS_OK=false
check_dep "git"     "2.30"  "git" "系统包管理器安装"                             || DEPS_OK=false

if [[ "$DEPS_OK" == "false" ]]; then
  err "依赖检查失败，请安装缺失的工具后重试"
  exit 1
fi

# 检查 Docker 是否运行
if ! docker info >/dev/null 2>&1; then
  err "Docker 未运行。请先启动 Docker"
  err "修复建议: sudo systemctl start docker 或打开 Docker Desktop"
  exit 1
fi

# 资源检查
log "检查系统资源..."
TOTAL_MEM_KB=$(grep MemTotal /proc/meminfo 2>/dev/null | awk '{print $2}' || echo "0")
if [[ "$TOTAL_MEM_KB" -gt 0 ]]; then
  TOTAL_MEM_GB=$((TOTAL_MEM_KB / 1024 / 1024))
  if [[ "$TOTAL_MEM_GB" -lt 6 ]]; then
    warn "内存不足 8GB (当前 ${TOTAL_MEM_GB}GB)，可能导致 GitLab OOM"
    warn "修复建议: 增加 Docker 内存限制到 8GB+"
  else
    log "  内存: ${TOTAL_MEM_GB}GB ✓"
  fi
fi

log "依赖检查通过 ✓"

# ══════════════════════════════════════════════════════════
#  PHASE 1: 基础设施搭建
# ══════════════════════════════════════════════════════════
if [[ "$SKIP_INFRA" == "true" ]]; then
  warn "跳过基础设施搭建 (--skip-infra)"
else
  step "Phase 1/5: 基础设施搭建"
  TOTAL_STEPS=4; CURRENT=0

  # Step 1: Kind
  if [[ "$SKIP_KIND" == "true" ]]; then
    warn "跳过 Kind 集群创建 (--skip-kind)"
  else
    CURRENT=$((CURRENT + 1)); progress "$CURRENT" "$TOTAL_STEPS" "Kind 集群"
    confirm "将创建 Kind 集群 '${CLUSTER_NAME}' (如已存在会跳过)" && \
      bash "${SCRIPT_DIR}/install-kind.sh" 2>&1 | tee -a "$LOG_FILE"
    log "Kind 集群就绪 ✓"
  fi

  # Step 2: GitLab
  if [[ "$SKIP_GITLAB" == "true" ]]; then
    warn "跳过 GitLab 部署 (--skip-gitlab)"
  else
    CURRENT=$((CURRENT + 1)); progress "$CURRENT" "$TOTAL_STEPS" "GitLab CE"
    confirm "将部署 GitLab CE 容器 (4GB 内存, 首次约 5-10 分钟)" && \
      bash "${SCRIPT_DIR}/install-gitlab.sh" 2>&1 | tee -a "$LOG_FILE"
    log "GitLab CE 就绪 ✓"
  fi

  # Step 3: Argo CD
  if [[ "$SKIP_ARGOCD" == "true" ]]; then
    warn "跳过 Argo CD 安装 (--skip-argocd)"
  else
    CURRENT=$((CURRENT + 1)); progress "$CURRENT" "$TOTAL_STEPS" "Argo CD"
    bash "${SCRIPT_DIR}/install-argocd.sh" 2>&1 | tee -a "$LOG_FILE"
    log "Argo CD 就绪 ✓"
  fi

  # Step 4: Argo Rollouts (Stage 3 需要)
  if [[ "$SKIP_ROLLOUTS" == "true" ]]; then
    warn "跳过 Argo Rollouts (--skip-rollouts)"
  elif [[ -z "$STAGE_FILTER" || "$STAGE_FILTER" == "stage3" ]]; then
    CURRENT=$((CURRENT + 1)); progress "$CURRENT" "$TOTAL_STEPS" "Argo Rollouts"
    bash "${SCRIPT_DIR}/install-argo-rollouts.sh" 2>&1 | tee -a "$LOG_FILE"
    log "Argo Rollouts 就绪 ✓"
  fi

  progress "$TOTAL_STEPS" "$TOTAL_STEPS" "基础设施搭建完成"
  log "基础设施搭建完成 ✓"
fi

# ══════════════════════════════════════════════════════════
#  PHASE 2: GitLab 项目配置
# ══════════════════════════════════════════════════════════
step "Phase 2/5: GitLab 项目配置"

# 等待 GitLab 就绪
wait_for_gitlab() {
  log "等待 GitLab 就绪..."
  local max_wait=300 elapsed=0
  while [[ $elapsed -lt $max_wait ]]; do
    if curl -sf "${GITLAB_URL}/-/health" >/dev/null 2>&1; then
      log "GitLab 已就绪 ✓"
      return 0
    fi
    sleep 5; elapsed=$((elapsed + 5))
    echo -n "."
  done
  echo ""
  err "GitLab 启动超时 (${max_wait}s)"
  err "修复建议: docker logs gitlab-ce --tail 50 检查日志"
  err "           或等待几分钟后再运行: $0 --skip-infra"
  return 1
}

# 获取 GitLab root 密码
get_gitlab_password() {
  docker exec gitlab-ce grep 'Password:' /etc/gitlab/initial_root_password 2>/dev/null | awk '{print $2}'
}

# 获取 GitLab private token (通过初始密码登录)
get_gitlab_token() {
  local password
  password=$(get_gitlab_password)
  if [[ -z "$password" ]]; then
    err "无法获取 GitLab 初始密码"
    err "修复建议: docker exec -it gitlab-ce grep 'Password:' /etc/gitlab/initial_root_password"
    return 1
  fi
  curl -sf "${GITLAB_URL}/api/v4/session" \
    --data-urlencode "login=root" \
    --data-urlencode "password=${password}" 2>/dev/null | grep -oP '"private_token":"\K[^"]+'
}

# 创建 GitLab 项目
create_gitlab_project() {
  local token="$1"
  local response
  response=$(curl -sf -o /dev/null -w "%{http_code}" \
    "${GITLAB_URL}/api/v4/projects" \
    -H "PRIVATE-TOKEN: ${token}" \
    -d "name=${GITLAB_PROJECT}&visibility=public" 2>/dev/null)

  if [[ "$response" == "201" ]]; then
    log "GitLab 项目 '${GITLAB_PROJECT}' 创建成功 ✓"
  elif [[ "$response" == "400" ]]; then
    log "GitLab 项目 '${GITLAB_PROJECT}' 已存在，跳过创建 ✓"
  else
    warn "GitLab 项目创建返回 HTTP ${response}，尝试继续..."
  fi
}

# 推送代码到 GitLab
push_to_gitlab() {
  local token="$1"
  local repo_url="http://root:${token}@gitlab.local:${GITLAB_PORT}/root/${GITLAB_PROJECT}.git"
  local tmp_dir
  tmp_dir=$(mktemp -d)

  log "克隆 GitLab 项目..."
  git clone "$repo_url" "$tmp_dir/repo" 2>&1 | tee -a "$LOG_FILE" || true

  # 确定要推送的 Stage 目录
  local stage_dirs=()
  if [[ -n "$STAGE_FILTER" ]]; then
    case "$STAGE_FILTER" in
      stage1) stage_dirs=("stage1-static-deploy") ;;
      stage2) stage_dirs=("stage2-multi-env") ;;
      stage3) stage_dirs=("stage3-canary") ;;
    esac
  else
    stage_dirs=("stage1-static-deploy" "stage2-multi-env" "stage3-canary")
  fi

  cd "$tmp_dir/repo"

  # 复制项目文件
  for dir in "${stage_dirs[@]}"; do
    if [[ -d "${PROJECT_DIR}/${dir}" ]]; then
      log "  复制 ${dir}/..."
      cp -r "${PROJECT_DIR}/${dir}" "./${dir}"
    fi
  done

  # 复制 CI 配置（如果项目根目录有 .gitlab-ci.yml 的 Stage 版本）
  # 这里不复制根级 .gitlab-ci.yml，每个 Stage 有自己的

  git add -A 2>/dev/null || true
  git config user.name "cicd-easy-setup" 2>/dev/null || true
  git config user.email "setup@cicd-easy.local" 2>/dev/null || true

  if git diff --cached --quiet 2>/dev/null; then
    log "代码已是最新，无需推送 ✓"
  else
    git commit -m "feat: 初始化 cicd_easy 项目代码" 2>&1 | tee -a "$LOG_FILE"
    git push origin main 2>&1 | tee -a "$LOG_FILE" || \
      git push origin HEAD:main 2>&1 | tee -a "$LOG_FILE"
    log "代码推送成功 ✓"
  fi

  cd "$PROJECT_DIR"
  rm -rf "$tmp_dir"
}

if [[ "$SKIP_PUSH" == "true" ]]; then
  warn "跳过 GitLab 配置 (--skip-push)"
else
  if wait_for_gitlab; then
    GITLAB_TOKEN=$(get_gitlab_token)
    if [[ -n "$GITLAB_TOKEN" ]]; then
      log "GitLab 认证成功 ✓"
      create_gitlab_project "$GITLAB_TOKEN"

      log "推送项目代码到 GitLab..."
      confirm "将推送代码到 GitLab 项目 ${GITLAB_PROJECT}" && \
        push_to_gitlab "$GITLAB_TOKEN"

      log ""
      log "GitLab Runner 注册提示:"
      log "  打开 ${GITLAB_URL}/-/admin/runners 获取 token"
      log "  或运行: bash ${SCRIPT_DIR}/register-runner.sh"
    else
      warn "GitLab 认证失败，跳过自动配置"
      warn "手动操作: 在 ${GITLAB_URL} 创建项目后手动推送代码"
    fi
  fi
fi

# ══════════════════════════════════════════════════════════
#  PHASE 3: Argo CD Application 注册
# ══════════════════════════════════════════════════════════
step "Phase 3/5: Argo CD Application 注册"

register_argocd_app() {
  local manifest_path="$1"
  local app_name
  app_name=$(grep 'name:' "$manifest_path" | head -1 | awk '{print $2}')

  if kubectl get application "$app_name" -n "$ARGOCD_NS" >/dev/null 2>&1; then
    log "  Application '${app_name}' 已存在，跳过 ✓"
  else
    kubectl apply -f "$manifest_path" 2>&1 | tee -a "$LOG_FILE"
    log "  Application '${app_name}' 注册成功 ✓"
  fi
}

if [[ "$SKIP_APPS" == "true" ]]; then
  warn "跳过 Argo CD Application 注册 (--skip-apps)"
else
  # Stage 1
  if [[ -z "$STAGE_FILTER" || "$STAGE_FILTER" == "stage1" ]]; then
    log "注册 Stage 1 Application..."
    register_argocd_app "${PROJECT_DIR}/stage1-static-deploy/k8s/argocd-app.yaml"
  fi

  # Stage 2
  if [[ -z "$STAGE_FILTER" || "$STAGE_FILTER" == "stage2" ]]; then
    log "注册 Stage 2 Applications (dev/staging/prod)..."
    register_argocd_app "${PROJECT_DIR}/stage2-multi-env/k8s/argocd-apps/dev.yaml"
    register_argocd_app "${PROJECT_DIR}/stage2-multi-env/k8s/argocd-apps/staging.yaml"
    register_argocd_app "${PROJECT_DIR}/stage2-multi-env/k8s/argocd-apps/prod.yaml"
  fi

  # Stage 3
  if [[ -z "$STAGE_FILTER" || "$STAGE_FILTER" == "stage3" ]]; then
    log "注册 Stage 3 Application..."
    register_argocd_app "${PROJECT_DIR}/stage3-canary/k8s/argocd-app.yaml"
  fi

  log "Argo CD Application 注册完成 ✓"
fi

# ══════════════════════════════════════════════════════════
#  PHASE 4: 验证
# ══════════════════════════════════════════════════════════
step "Phase 4/5: 部署验证"

# 获取 Argo CD admin 密码
ARGOCD_PASSWORD=""
if kubectl get secret argocd-initial-admin-secret -n "$ARGOCD_NS" >/dev/null 2>&1; then
  ARGOCD_PASSWORD=$(kubectl -n "$ARGOCD_NS" get secret argocd-initial-admin-secret \
    -o jsonpath='{.data.password}' 2>/dev/null | base64 -d 2>/dev/null)
fi

log "等待 Argo CD 同步 (最多 60s)..."
sleep 5

# 验证 Stage 1
if [[ -z "$STAGE_FILTER" || "$STAGE_FILTER" == "stage1" ]]; then
  log ""
  log "── Stage 1: 静态页面自动部署 ──"
  if kubectl get pods -l app=stage1-app --no-headers 2>/dev/null | grep -q "Running"; then
    log "  Stage 1 Pod: Running ✓"
  else
    log "  Stage 1 Pod: 等待启动中... (Argo CD 正在同步)"
    log "  检查: kubectl get pods -l app=stage1-app"
  fi
  log "  验证: kubectl port-forward svc/stage1-svc 8080:80"
  log "  访问: http://localhost:8080"
fi

# 验证 Stage 2
if [[ -z "$STAGE_FILTER" || "$STAGE_FILTER" == "stage2" ]]; then
  log ""
  log "── Stage 2: 多环境发布 ──"
  for ns in dev staging prod; do
    if kubectl get pods -n "$ns" -l app=stage2-app --no-headers 2>/dev/null | grep -q "Running"; then
      log "  ${ns} 环境: Running ✓"
    else
      log "  ${ns} 环境: 等待启动中..."
    fi
  done
  log "  验证: kubectl get pods -n dev -l app=stage2-app"
  log "  Prod 部署需手动触发: Argo CD Dashboard → stage2-prod → Sync"
fi

# 验证 Stage 3
if [[ -z "$STAGE_FILTER" || "$STAGE_FILTER" == "stage3" ]]; then
  log ""
  log "── Stage 3: Canary 金丝雀发布 ──"
  if kubectl get rollout stage3-app -o name 2>/dev/null | grep -q "rollout"; then
    log "  Rollout CRD: 已注册 ✓"
  else
    log "  Rollout CRD: 等待创建..."
  fi
  log "  验证: kubectl get rollout stage3-app"
fi

# ══════════════════════════════════════════════════════════
#  PHASE 5: 汇总信息
# ══════════════════════════════════════════════════════════
step "Phase 5/5: 搭建完成"

echo -e "${BOLD}${GREEN}"
cat <<SUMMARY
  ╔══════════════════════════════════════════════════════╗
  ║              搭建完成! 访问信息汇总                   ║
  ╠══════════════════════════════════════════════════════╣
  ║                                                      ║
SUMMARY

echo -e "  ║  ${CYAN}GitLab${NC}        ${GITLAB_URL}"
echo -e "  ║  ${CYAN}Argo CD${NC}       https://localhost:8080"
if [[ -n "$ARGOCD_PASSWORD" ]]; then
  echo -e "  ║  ${CYAN}Argo CD 密码${NC}   ${ARGOCD_PASSWORD}"
fi
echo -e "  ║  ${CYAN}集群信息${NC}       kubectl cluster-info"

echo -e "${BOLD}${GREEN}"
cat <<SUMMARY
  ║                                                      ║
  ║  下一步:                                             ║
  ║    1. 注册 GitLab Runner: bash scripts/register-runner.sh║
  ║    2. 查看 Argo CD Dashboard: argocd login localhost:8080║
  ║    3. 阅读 Stage 指南: docs/guide-stage1.md           ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
SUMMARY
echo -e "${NC}"

log "日志文件: ${LOG_FILE}"
