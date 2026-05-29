import React, {useState} from 'react';

interface Step {
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {title: '选择构建方式', description: '选择镜像构建工具'},
  {title: '配置构建参数', description: '设置 Dockerfile 路径和镜像名'},
  {title: '配置部署目标', description: '设置 namespace 和副本数'},
];

interface BuildConfig {
  buildTool: 'kaniko' | 'docker';
  dockerfile: string;
  imageName: string;
  namespace: string;
  replicas: number;
  registry: string;
}

function generateCI(config: BuildConfig): string {
  const buildImage =
    config.buildTool === 'kaniko'
      ? 'gcr.io/kaniko-project/executor:debug'
      : 'docker:24-dind';
  const buildScript =
    config.buildTool === 'kaniko'
      ? `    - /kaniko/executor\n      --dockerfile=${config.dockerfile}\n      --context=.\n      --destination=$CI_REGISTRY_IMAGE/${config.imageName}:$CI_COMMIT_SHORT_SHA`
      : `    - docker build -f ${config.dockerfile} -t $CI_REGISTRY_IMAGE/${config.imageName}:$CI_COMMIT_SHORT_SHA .\n    - docker push $CI_REGISTRY_IMAGE/${config.imageName}:$CI_COMMIT_SHORT_SHA`;

  return `stages:
  - build
  - deploy

build-image:
  stage: build
  image:
    name: ${buildImage}
    entrypoint: [""]
  script:
${buildScript}
  only:
    - main

deploy:
  stage: deploy
  image: bitnami/kubectl
  script:
    - kubectl apply -f k8s/deployment.yaml
    - kubectl apply -f k8s/service.yaml
  only:
    - main
`;
}

function generateDeployment(config: BuildConfig): string {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${config.imageName}
  namespace: ${config.namespace}
spec:
  replicas: ${config.replicas}
  selector:
    matchLabels:
      app: ${config.imageName}
  template:
    metadata:
      labels:
        app: ${config.imageName}
    spec:
      containers:
      - name: ${config.imageName}
        image: ${config.registry}/${config.imageName}:latest
        ports:
        - containerPort: 80
`;
}

export default function PipelineBuilder(): JSX.Element {
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<BuildConfig>({
    buildTool: 'kaniko',
    dockerfile: 'Dockerfile',
    imageName: 'my-app',
    namespace: 'default',
    replicas: 1,
    registry: 'registry.local',
  });

  const ciYaml = generateCI(config);
  const deployYaml = generateDeployment(config);

  return (
    <div className="pipeline-builder">
      <div className="pipeline-builder__steps">
        {STEPS.map((step, idx) => (
          <div
            key={idx}
            className={`pipeline-builder__step ${
              idx === currentStep ? 'pipeline-builder__step--active' : ''
            } ${idx < currentStep ? 'pipeline-builder__step--done' : ''}`}
            onClick={() => setCurrentStep(idx)}>
            <div className="pipeline-builder__step-num">
              {idx < currentStep ? '✓' : idx + 1}
            </div>
            <div className="pipeline-builder__step-info">
              <div className="pipeline-builder__step-title">{step.title}</div>
              <div className="pipeline-builder__step-desc">{step.description}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="pipeline-builder__content">
        {currentStep === 0 && (
          <div className="pipeline-builder__form">
            <h4>选择构建方式</h4>
            <div className="pipeline-builder__options">
              <label
                className={`pipeline-builder__option ${
                  config.buildTool === 'kaniko' ? 'pipeline-builder__option--selected' : ''
                }`}>
                <input
                  type="radio"
                  name="buildTool"
                  value="kaniko"
                  checked={config.buildTool === 'kaniko'}
                  onChange={() => setConfig({...config, buildTool: 'kaniko'})}
                />
                <div>
                  <strong>Kaniko</strong>
                  <p>在 Kubernetes 集群内构建镜像，无需 Docker daemon</p>
                </div>
              </label>
              <label
                className={`pipeline-builder__option ${
                  config.buildTool === 'docker' ? 'pipeline-builder__option--selected' : ''
                }`}>
                <input
                  type="radio"
                  name="buildTool"
                  value="docker"
                  checked={config.buildTool === 'docker'}
                  onChange={() => setConfig({...config, buildTool: 'docker'})}
                />
                <div>
                  <strong>Docker Build</strong>
                  <p>传统 Docker daemon 构建，需要 Docker-in-Docker 支持</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="pipeline-builder__form">
            <h4>配置构建参数</h4>
            <div className="pipeline-builder__field">
              <label>Dockerfile 路径</label>
              <input
                type="text"
                value={config.dockerfile}
                onChange={(e) => setConfig({...config, dockerfile: e.target.value})}
                placeholder="Dockerfile"
              />
            </div>
            <div className="pipeline-builder__field">
              <label>镜像名称</label>
              <input
                type="text"
                value={config.imageName}
                onChange={(e) => setConfig({...config, imageName: e.target.value})}
                placeholder="my-app"
              />
            </div>
            <div className="pipeline-builder__field">
              <label>Registry 地址</label>
              <input
                type="text"
                value={config.registry}
                onChange={(e) => setConfig({...config, registry: e.target.value})}
                placeholder="registry.local"
              />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="pipeline-builder__form">
            <h4>配置部署目标</h4>
            <div className="pipeline-builder__field">
              <label>Namespace</label>
              <select
                value={config.namespace}
                onChange={(e) => setConfig({...config, namespace: e.target.value})}>
                <option value="default">default</option>
                <option value="stage1">stage1</option>
                <option value="production">production</option>
              </select>
            </div>
            <div className="pipeline-builder__field">
              <label>副本数 (Replicas)</label>
              <input
                type="range"
                min="1"
                max="10"
                value={config.replicas}
                onChange={(e) => setConfig({...config, replicas: parseInt(e.target.value)})}
              />
              <span className="pipeline-builder__range-val">{config.replicas}</span>
            </div>
          </div>
        )}
      </div>

      <div className="pipeline-builder__nav">
        <button
          className="button button--secondary button--sm"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep(currentStep - 1)}>
          上一步
        </button>
        <button
          className="button button--primary button--sm"
          disabled={currentStep === STEPS.length - 1}
          onClick={() => setCurrentStep(currentStep + 1)}>
          下一步
        </button>
      </div>

      <div className="pipeline-builder__output">
        <div className="pipeline-builder__output-col">
          <h4>.gitlab-ci.yml</h4>
          <pre><code>{ciYaml}</code></pre>
        </div>
        <div className="pipeline-builder__output-col">
          <h4>deployment.yaml</h4>
          <pre><code>{deployYaml}</code></pre>
        </div>
      </div>
    </div>
  );
}
