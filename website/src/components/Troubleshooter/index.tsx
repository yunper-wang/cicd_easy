import React, {useState, useCallback} from 'react';

interface DiagnosticStep {
  id: string;
  question: string;
  options: {
    label: string;
    nextStep?: string;
    result?: {
      title: string;
      cause: string;
      fix: string;
      commands?: string[];
    };
  }[];
}

const SCENARIOS: Record<string, DiagnosticStep> = {
  start: {
    id: 'start',
    question: '选择你要排查的问题类型：',
    options: [
      {label: 'Pod 一直处于 Pending 状态', nextStep: 'pending'},
      {label: '镜像拉取失败 (ImagePullBackOff)', nextStep: 'imagepull'},
      {label: 'Pipeline 构建失败', nextStep: 'pipeline'},
      {label: 'Argo CD Sync 失败', nextStep: 'argocd'},
    ],
  },
  pending: {
    id: 'pending',
    question: 'Pod 处于 Pending 状态，先检查事件信息：',
    options: [
      {
        label: '显示 "Insufficient cpu/memory"',
        nextStep: 'pending-resource',
      },
      {
        label: '显示 "PersistentVolumeClaim not bound"',
        nextStep: 'pending-pvc',
      },
      {
        label: '显示 "node(s) didn\'t match node selector"',
        result: {
          title: 'Node Selector 不匹配',
          cause: 'Pod 的 nodeSelector 或 nodeAffinity 没有匹配到任何节点',
          fix: '检查节点的标签和 Pod 的 selector 是否一致',
          commands: [
            'kubectl get nodes --show-labels',
            'kubectl describe pod <pod-name> | grep -A5 Node-Selectors',
          ],
        },
      },
    ],
  },
  'pending-resource': {
    id: 'pending-resource',
    question: '是 CPU 不足还是内存不足？',
    options: [
      {
        label: 'CPU 不足 (Insufficient cpu)',
        result: {
          title: '节点 CPU 资源不足',
          cause: '集群节点没有足够的 CPU 满足 Pod 的 resource.requests.cpu',
          fix: '降低 Pod 的 CPU 请求值，或增加节点资源',
          commands: [
            'kubectl describe node | grep -A5 "Allocated resources"',
            'kubectl get pods -A -o json | jq \'.items[] | .spec.containers[].resources.requests.cpu\'',
          ],
        },
      },
      {
        label: '内存不足 (Insufficient memory)',
        result: {
          title: '节点内存资源不足',
          cause: '集群节点没有足够的内存满足 Pod 的 resource.requests.memory',
          fix: '降低 Pod 的内存请求值，或增加 Docker Desktop 内存限制到 8GB+',
          commands: [
            'kubectl describe node | grep -A5 "Allocated resources"',
            'kubectl top nodes',
          ],
        },
      },
    ],
  },
  'pending-pvc': {
    id: 'pending-pvc',
    question: '集群中是否有可用的 PersistentVolume？',
    options: [
      {
        label: '没有 PV 或 PV 已被绑定',
        result: {
          title: '存储卷未就绪',
          cause: 'PVC 找不到匹配的 PersistentVolume，通常在本地 Kind 集群中缺少 StorageClass',
          fix: '创建本地 StorageClass 或手动创建 PV',
          commands: [
            'kubectl get sc',
            'kubectl get pv',
            'kubectl get pvc',
          ],
        },
      },
    ],
  },
  imagepull: {
    id: 'imagepull',
    question: '镜像地址格式是什么？',
    options: [
      {
        label: '使用本地 Registry (registry.local:5050)',
        nextStep: 'imagepull-local',
      },
      {
        label: '使用公网镜像 (docker.io / gcr.io)',
        nextStep: 'imagepull-public',
      },
    ],
  },
  'imagepull-local': {
    id: 'imagepull-local',
    question: 'GitLab Registry 是否正常运行？',
    options: [
      {
        label: '不确定 / 没有检查过',
        result: {
          title: 'GitLab Registry 未就绪',
          cause: 'GitLab Container Registry 可能未启动或端口映射不正确',
          fix: '确认 GitLab 容器正常运行，5050 端口已映射',
          commands: [
            'docker ps | grep gitlab',
            'curl -sf http://gitlab.local:5050/v2/_catalog',
            'docker logs gitlab-ce --tail 50',
          ],
        },
      },
      {
        label: 'Registry 正常，但镜像不存在',
        result: {
          title: '镜像未推送到 Registry',
          cause: 'CI Pipeline 的 build 阶段可能失败，镜像尚未构建推送',
          fix: '在 GitLab 中检查 Pipeline 状态，确认 build job 成功',
          commands: [
            'curl -sf http://gitlab.local:5050/v2/_catalog',
            'curl -sf http://gitlab.local:5050/v2/<image>/tags/list',
          ],
        },
      },
    ],
  },
  'imagepull-public': {
    id: 'imagepull-public',
    question: 'Kind 集群能否访问外网？',
    options: [
      {
        label: '不确定',
        result: {
          title: '集群网络问题',
          cause: 'Kind 集群的容器可能无法解析外部域名或访问外网',
          fix: '检查 Kind 容器的 DNS 和网络配置',
          commands: [
            'kubectl run test --image=busybox --rm -it -- wget -qO- https://google.com',
            'docker exec cicd-easy-control-plane cat /etc/resolv.conf',
          ],
        },
      },
      {
        label: '能访问，但报 403 / rate limit',
        result: {
          title: 'Docker Hub 速率限制',
          cause: 'Docker Hub 对匿名拉取有 100 次/6 小时的限制',
          fix: '使用镜像加速器或登录 Docker Hub 账号',
          commands: [
            'docker login',
            'kubectl create secret docker-registry regcred ...',
          ],
        },
      },
    ],
  },
  pipeline: {
    id: 'pipeline',
    question: 'Pipeline 在哪个阶段失败？',
    options: [
      {
        label: 'Build 阶段 (镜像构建)',
        nextStep: 'pipeline-build',
      },
      {
        label: 'Deploy 阶段 (部署应用)',
        result: {
          title: '部署阶段失败',
          cause: 'kubectl apply 或 rollout status 命令失败，通常因为 kubeconfig 未配置或 manifest 有误',
          fix: '确认 CI Runner 能访问集群，检查 YAML 语法',
          commands: [
            'kubectl config current-context',
            'kubectl apply -f k8s/ --dry-run=client',
          ],
        },
      },
      {
        label: 'Runner 未注册 / 离线',
        result: {
          title: 'GitLab Runner 不可用',
          cause: '没有注册 GitLab Runner 或 Runner 服务未运行',
          fix: '注册 Runner 并确认其在线',
          commands: [
            'bash scripts/register-runner.sh',
            '检查 GitLab → Settings → CI/CD → Runners',
          ],
        },
      },
    ],
  },
  'pipeline-build': {
    id: 'pipeline-build',
    question: '构建失败的具体错误？',
    options: [
      {
        label: 'Dockerfile 未找到或语法错误',
        result: {
          title: 'Dockerfile 问题',
          cause: 'Dockerfile 路径不对或语法有误',
          fix: '确认 Dockerfile 存在于仓库根目录，且语法正确',
          commands: [
            'docker build -f Dockerfile -t test . --dry-run',
            'cat Dockerfile | head -20',
          ],
        },
      },
      {
        label: 'Registry push 失败 (认证)',
        result: {
          title: 'Registry 认证失败',
          cause: 'CI_JOB_TOKEN 未正确传递或 Registry 不接受推送',
          fix: '确认 .gitlab-ci.yml 中使用了 $CI_REGISTRY_USER 和 $CI_REGISTRY_PASSWORD',
          commands: [
            'echo $CI_REGISTRY',
            'docker login $CI_REGISTRY -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD',
          ],
        },
      },
    ],
  },
  argocd: {
    id: 'argocd',
    question: 'Argo CD 报什么错误？',
    options: [
      {
        label: 'Sync 状态一直 OutOfSync',
        nextStep: 'argocd-outofsync',
      },
      {
        label: 'Sync 失败 (Sync Failed)',
        result: {
          title: 'Argo CD Sync 失败',
          cause: 'Git 仓库中的 manifest 无法应用到集群，通常因为权限或资源冲突',
          fix: '检查 Argo CD 的集群权限和应用日志',
          commands: [
            'kubectl logs -n argocd deployment/argocd-application-controller --tail=50',
            'argocd app get <app-name> --show-params',
          ],
        },
      },
      {
        label: 'Application 无法创建 (Unknown)',
        result: {
          title: 'Argo CD 无法连接 Git 仓库',
          cause: 'Argo CD 无法访问 GitLab 仓库 URL，通常因为网络或认证',
          fix: '检查 repoURL 是否正确，配置 GitLab 访问凭据',
          commands: [
            'argocd repo list',
            'argocd repo add http://gitlab.local:8929/root/cicd-demo.git --username root',
          ],
        },
      },
    ],
  },
  'argocd-outofsync': {
    id: 'argocd-outofsync',
    question: 'Git 仓库有新的提交吗？',
    options: [
      {
        label: '有新提交，但 Argo CD 没检测到',
        result: {
          title: 'Argo CD 未检测到变更',
          cause: 'Sync Policy 可能是 Manual，或者轮询间隔太长',
          fix: '设置 automated sync 或手动触发 Sync',
          commands: [
            'argocd app sync <app-name>',
            'argocd app set <app-name> --sync-policy automated',
          ],
        },
      },
      {
        label: '没有新提交，但状态不一致',
        result: {
          title: '集群状态漂移',
          cause: '有人直接修改了集群资源（kubectl edit），导致与 Git 声明不一致',
          fix: '让 Argo CD 重新 Sync 回 Git 定义的状态',
          commands: [
            'argocd app diff <app-name>',
            'argocd app sync <app-name>',
          ],
        },
      },
    ],
  },
};

export default function Troubleshooter(): JSX.Element {
  const [currentStep, setCurrentStep] = useState<string>('start');
  const [history, setHistory] = useState<string[]>([]);
  const [result, setResult] = useState<NonNullable<DiagnosticStep['options'][number]['result']>|null>(null);

  const handleSelect = useCallback((option: DiagnosticStep['options'][number]) => {
    if (option.result) {
      setResult(option.result);
    } else if (option.nextStep) {
      setHistory((h) => [...h, currentStep]);
      setCurrentStep(option.nextStep);
      setResult(null);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    const prev = history[history.length - 1];
    if (prev) {
      setHistory((h) => h.slice(0, -1));
      setCurrentStep(prev);
      setResult(null);
    }
  }, [history]);

  const handleReset = useCallback(() => {
    setCurrentStep('start');
    setHistory([]);
    setResult(null);
  }, []);

  const step = SCENARIOS[currentStep];

  return (
    <div className="troubleshooter">
      <div className="troubleshooter__header">
        <h4>故障排查助手</h4>
        <div className="troubleshooter__nav">
          {history.length > 0 && (
            <button className="button button--sm button--secondary" onClick={handleBack}>
              ← 上一步
            </button>
          )}
          <button className="button button--sm button--secondary" onClick={handleReset}>
            重新开始
          </button>
        </div>
      </div>

      <div className="troubleshooter__body">
        {result ? (
          <div className="troubleshooter__result">
            <div className="troubleshooter__result-title troubleshooter__result-title--found">
              {result.title}
            </div>
            <div className="troubleshooter__section">
              <strong>原因：</strong>{result.cause}
            </div>
            <div className="troubleshooter__section">
              <strong>修复方法：</strong>{result.fix}
            </div>
            {result.commands && (
              <div className="troubleshooter__commands">
                <strong>排查命令：</strong>
                {result.commands.map((cmd, i) => (
                  <div key={i} className="troubleshooter__cmd">
                    <code>{cmd}</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="troubleshooter__question">{step.question}</div>
            <div className="troubleshooter__options">
              {step.options.map((option, idx) => (
                <button
                  key={idx}
                  className="troubleshooter__option"
                  onClick={() => handleSelect(option)}>
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {history.length > 0 && (
        <div className="troubleshooter__breadcrumb">
          {history.map((stepId, i) => (
            <span key={i} className="troubleshooter__breadcrumb-item">
              {SCENARIOS[stepId]?.question.slice(0, 15)}... →
            </span>
          ))}
          <span className="troubleshooter__breadcrumb-item troubleshooter__breadcrumb-item--current">
            当前
          </span>
        </div>
      )}
    </div>
  );
}
