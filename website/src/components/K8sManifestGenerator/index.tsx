import React, {useState} from 'react';

interface EnvConfig {
  name: string;
  replicas: number;
  imageTag: string;
  cpuRequest: string;
  cpuLimit: string;
  memoryRequest: string;
  memoryLimit: string;
  syncPolicy: 'auto' | 'manual';
}

const DEFAULT_ENVS: Record<string, EnvConfig> = {
  dev: {name: 'dev', replicas: 1, imageTag: 'dev-latest', cpuRequest: '100m', cpuLimit: '200m', memoryRequest: '128Mi', memoryLimit: '256Mi', syncPolicy: 'auto'},
  staging: {name: 'staging', replicas: 2, imageTag: 'staging-latest', cpuRequest: '200m', cpuLimit: '500m', memoryRequest: '256Mi', memoryLimit: '512Mi', syncPolicy: 'auto'},
  prod: {name: 'prod', replicas: 3, imageTag: 'v1.0.0', cpuRequest: '500m', cpuLimit: '1000m', memoryRequest: '512Mi', memoryLimit: '1Gi', syncPolicy: 'manual'},
};

function generateKustomization(env: EnvConfig): string {
  return `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - target:
      kind: Deployment
    patch: |
      - op: replace
        path: /spec/replicas
        value: ${env.replicas}
      - op: replace
        path: /spec/template/spec/containers/0/image
        value: registry.local/my-app:${env.imageTag}
      - op: add
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: "${env.cpuRequest}"
            memory: "${env.memoryRequest}"
          limits:
            cpu: "${env.cpuLimit}"
            memory: "${env.memoryLimit}"
namespace: my-app-${env.name}
`;
}

function generateArgoApp(env: EnvConfig): string {
  const syncStr = env.syncPolicy === 'auto'
    ? `    automated:\n      prune: true\n      selfHeal: true`
    : '    # Manual sync - requires human approval';
  return `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-${env.name}
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://gitlab.example.com/my-app.git
    targetRevision: main
    path: k8s/overlays/${env.name}
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app-${env.name}
  syncPolicy:
${syncStr}
`;
}

export default function K8sManifestGenerator(): JSX.Element {
  const [selectedEnv, setSelectedEnv] = useState<string>('dev');
  const [envs, setEnvs] = useState<Record<string, EnvConfig>>({...DEFAULT_ENVS});
  const currentEnv = envs[selectedEnv];

  const updateEnv = (field: keyof EnvConfig, value: string | number) => {
    setEnvs({
      ...envs,
      [selectedEnv]: {...currentEnv, [field]: value},
    });
  };

  const kustomYaml = generateKustomization(currentEnv);
  const argoYaml = generateArgoApp(currentEnv);

  return (
    <div className="k8s-generator">
      <div className="k8s-generator__env-tabs">
        {Object.keys(DEFAULT_ENVS).map((env) => (
          <button
            key={env}
            className={`button button--sm ${env === selectedEnv ? 'button--primary' : 'button--secondary'}`}
            onClick={() => setSelectedEnv(env)}>
            {env.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="k8s-generator__content">
        <div className="k8s-generator__config">
          <h4>配置 {selectedEnv.toUpperCase()} 环境</h4>
          <div className="k8s-generator__field">
            <label>镜像标签</label>
            <input type="text" value={currentEnv.imageTag} onChange={(e) => updateEnv('imageTag', e.target.value)} />
          </div>
          <div className="k8s-generator__field">
            <label>副本数: {currentEnv.replicas}</label>
            <input type="range" min="1" max="10" value={currentEnv.replicas} onChange={(e) => updateEnv('replicas', parseInt(e.target.value))} />
          </div>
          <div className="k8s-generator__field">
            <label>CPU 请求/限制</label>
            <div className="k8s-generator__inline">
              <input type="text" value={currentEnv.cpuRequest} onChange={(e) => updateEnv('cpuRequest', e.target.value)} />
              <span>/</span>
              <input type="text" value={currentEnv.cpuLimit} onChange={(e) => updateEnv('cpuLimit', e.target.value)} />
            </div>
          </div>
          <div className="k8s-generator__field">
            <label>内存 请求/限制</label>
            <div className="k8s-generator__inline">
              <input type="text" value={currentEnv.memoryRequest} onChange={(e) => updateEnv('memoryRequest', e.target.value)} />
              <span>/</span>
              <input type="text" value={currentEnv.memoryLimit} onChange={(e) => updateEnv('memoryLimit', e.target.value)} />
            </div>
          </div>
          <div className="k8s-generator__field">
            <label>同步策略</label>
            <select value={currentEnv.syncPolicy} onChange={(e) => updateEnv('syncPolicy', e.target.value)}>
              <option value="auto">自动同步 (Auto Sync)</option>
              <option value="manual">手动同步 (Manual Sync)</option>
            </select>
          </div>
        </div>

        <div className="k8s-generator__preview">
          <div className="k8s-generator__output-col">
            <h4>kustomization.yaml</h4>
            <pre><code>{kustomYaml}</code></pre>
          </div>
          <div className="k8s-generator__output-col">
            <h4>argocd-app.yaml</h4>
            <pre><code>{argoYaml}</code></pre>
          </div>
        </div>
      </div>

      <div className="k8s-generator__comparison">
        <h4>环境对比</h4>
        <table>
          <thead>
            <tr>
              <th>参数</th>
              <th>DEV</th>
              <th>STAGING</th>
              <th>PROD</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Replicas</td>
              <td>{envs.dev.replicas}</td>
              <td>{envs.staging.replicas}</td>
              <td>{envs.prod.replicas}</td>
            </tr>
            <tr>
              <td>Image Tag</td>
              <td><code>{envs.dev.imageTag}</code></td>
              <td><code>{envs.staging.imageTag}</code></td>
              <td><code>{envs.prod.imageTag}</code></td>
            </tr>
            <tr>
              <td>CPU Limit</td>
              <td>{envs.dev.cpuLimit}</td>
              <td>{envs.staging.cpuLimit}</td>
              <td>{envs.prod.cpuLimit}</td>
            </tr>
            <tr>
              <td>Memory Limit</td>
              <td>{envs.dev.memoryLimit}</td>
              <td>{envs.staging.memoryLimit}</td>
              <td>{envs.prod.memoryLimit}</td>
            </tr>
            <tr>
              <td>Sync Policy</td>
              <td>{envs.dev.syncPolicy}</td>
              <td>{envs.staging.syncPolicy}</td>
              <td><strong>{envs.prod.syncPolicy}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
