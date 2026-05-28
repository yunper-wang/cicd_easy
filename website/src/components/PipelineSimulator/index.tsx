import React, {useState, useCallback} from 'react';

interface Phase {
  name: string;
  icon: string;
  duration: string;
}

const PIPELINE_PHASES: Phase[] = [
  {name: 'Git Push', icon: '📤', duration: '即时'},
  {name: 'CI Trigger', icon: '⚡', duration: '1s'},
  {name: 'Build Image', icon: '🔨', duration: '60s'},
  {name: 'Push Registry', icon: '📦', duration: '10s'},
  {name: 'Argo CD Detect', icon: '👁️', duration: '5s'},
  {name: 'Sync Manifests', icon: '🔄', duration: '3s'},
  {name: 'Rolling Update', icon: '🚀', duration: '30s'},
  {name: 'Health Check', icon: '✅', duration: '10s'},
];

interface CanaryStep {
  weight: number;
  status: 'pending' | 'running' | 'success' | 'failed';
}

const INITIAL_CANARY: CanaryStep[] = [
  {weight: 0, status: 'success'},
  {weight: 20, status: 'pending'},
  {weight: 40, status: 'pending'},
  {weight: 60, status: 'pending'},
  {weight: 80, status: 'pending'},
  {weight: 100, status: 'pending'},
];

export default function PipelineSimulator(): JSX.Element {
  const [mode, setMode] = useState<'pipeline' | 'canary'>('pipeline');
  const [pipelineStep, setPipelineStep] = useState(0);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [canarySteps, setCanarySteps] = useState<CanaryStep[]>(INITIAL_CANARY.map((s) => ({...s})));
  const [canaryRunning, setCanaryRunning] = useState(false);
  const [canaryResult, setCanaryResult] = useState<'success' | 'failed' | null>(null);

  const runPipeline = useCallback(() => {
    setPipelineStep(0);
    setPipelineRunning(true);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setPipelineStep(step);
      if (step >= PIPELINE_PHASES.length) {
        clearInterval(interval);
        setPipelineRunning(false);
      }
    }, 800);
  }, []);

  const runCanary = useCallback(() => {
    const newSteps = INITIAL_CANARY.map((s) => ({...s, status: 'pending' as const}));
    newSteps[0].status = 'success';
    setCanarySteps(newSteps);
    setCanaryRunning(true);
    setCanaryResult(null);
    let step = 1;
    const willFailAt = Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 2 : -1;
    const interval = setInterval(() => {
      if (step <= willFailAt && willFailAt > 0) {
        newSteps[step].status = 'failed';
        setCanarySteps([...newSteps]);
        setCanaryResult('failed');
        setCanaryRunning(false);
        clearInterval(interval);
        return;
      }
      newSteps[step].status = 'success';
      setCanarySteps([...newSteps]);
      step++;
      if (step >= newSteps.length) {
        setCanaryResult('success');
        setCanaryRunning(false);
        clearInterval(interval);
      }
    }, 1200);
  }, []);

  return (
    <div className="pipeline-simulator">
      <div className="pipeline-simulator__tabs">
        <button
          className={`button button--sm ${mode === 'pipeline' ? 'button--primary' : 'button--secondary'}`}
          onClick={() => setMode('pipeline')}>
          CI/CD Pipeline 流程
        </button>
        <button
          className={`button button--sm ${mode === 'canary' ? 'button--primary' : 'button--secondary'}`}
          onClick={() => setMode('canary')}>
          Canary 发布模拟
        </button>
      </div>

      {mode === 'pipeline' && (
        <div className="pipeline-simulator__pipeline">
          <div className="pipeline-simulator__flow">
            {PIPELINE_PHASES.map((phase, idx) => (
              <div
                key={idx}
                className={`pipeline-simulator__phase ${
                  idx < pipelineStep ? 'pipeline-simulator__phase--done' : ''
                } ${idx === pipelineStep - 1 ? 'pipeline-simulator__phase--current' : ''}`}>
                <div className="pipeline-simulator__phase-icon">{phase.icon}</div>
                <div className="pipeline-simulator__phase-name">{phase.name}</div>
                <div className="pipeline-simulator__phase-time">{phase.duration}</div>
                {idx < PIPELINE_PHASES.length - 1 && (
                  <div className={`pipeline-simulator__arrow ${idx < pipelineStep ? 'pipeline-simulator__arrow--active' : ''}`}>
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
          {pipelineStep >= PIPELINE_PHASES.length && (
            <div className="pipeline-simulator__result pipeline-simulator__result--success">
              部署完成! 应用已成功更新并就绪。
            </div>
          )}
          <button
            className="button button--primary"
            disabled={pipelineRunning}
            onClick={runPipeline}>
            {pipelineRunning ? '执行中...' : '开始 Pipeline 模拟'}
          </button>
        </div>
      )}

      {mode === 'canary' && (
        <div className="pipeline-simulator__canary">
          <div className="pipeline-simulator__canary-visual">
            <div className="pipeline-simulator__canary-bar">
              <div
                className="pipeline-simulator__canary-new"
                style={{width: `${canarySteps.filter((s) => s.status === 'success').slice(-1)[0]?.weight || 0}%`}}>
                新版本
              </div>
              <div className="pipeline-simulator__canary-old">旧版本</div>
            </div>
            <div className="pipeline-simulator__canary-steps">
              {canarySteps.map((step, idx) => (
                <div
                  key={idx}
                  className={`pipeline-simulator__canary-step pipeline-simulator__canary-step--${step.status}`}>
                  <span className="pipeline-simulator__canary-weight">{step.weight}%</span>
                  <span className="pipeline-simulator__canary-status">
                    {step.status === 'success' ? '✓' : step.status === 'failed' ? '✗' : step.status === 'running' ? '▸' : '○'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {canaryResult === 'success' && (
            <div className="pipeline-simulator__result pipeline-simulator__result--success">
              Canary 发布成功! 新版本已全面上线。
            </div>
          )}
          {canaryResult === 'failed' && (
            <div className="pipeline-simulator__result pipeline-simulator__result--failed">
              分析检测到异常指标! 自动回滚到旧版本。
            </div>
          )}
          <button
            className="button button--primary"
            disabled={canaryRunning}
            onClick={runCanary}>
            {canaryRunning ? '发布中...' : '开始 Canary 模拟'}
          </button>
          <p className="pipeline-simulator__hint">
            每次模拟有 ~40% 概率触发分析失败和自动回滚
          </p>
        </div>
      )}
    </div>
  );
}
