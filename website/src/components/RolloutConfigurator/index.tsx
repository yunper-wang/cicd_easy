import React, {useState, useEffect, useCallback} from 'react';

type Strategy = 'canary' | 'bluegreen';

interface CanaryConfig {
  replicas: number;
  canaryWeight: number;
  maxSurge: number;
  maxUnavailable: number;
  analysisMetrics: string[];
}

interface BlueGreenConfig {
  activeReplicas: number;
  previewReplicas: number;
  autoPromotion: boolean;
  autoPromotionSeconds: number;
}

export interface RolloutConfig {
  canary?: CanaryConfig;
  bluegreen?: BlueGreenConfig;
}

export interface RolloutConfiguratorProps {
  strategy?: Strategy;
  initialConfig?: RolloutConfig;
}

const DEFAULT_CANARY: CanaryConfig = {
  replicas: 5,
  canaryWeight: 20,
  maxSurge: 1,
  maxUnavailable: 0,
  analysisMetrics: ['success-rate', 'latency-p99'],
};

const DEFAULT_BLUEGREEN: BlueGreenConfig = {
  activeReplicas: 3,
  previewReplicas: 3,
  autoPromotion: false,
  autoPromotionSeconds: 30,
};

const METRIC_OPTIONS = [
  {id: 'success-rate', label: '成功率 > 99%', description: 'HTTP 请求成功率阈值'},
  {id: 'latency-p99', label: 'P99 延迟 < 500ms', description: '99 分位延迟阈值'},
  {id: 'error-rate', label: '错误率 < 1%', description: '5xx 错误率阈值'},
  {id: 'cpu-usage', label: 'CPU < 80%', description: '容器 CPU 使用率阈值'},
];

const CANARY_STEPS = [0, 20, 40, 60, 80, 100];

function generateCanaryYaml(config: CanaryConfig): string {
  const steps = [];
  for (let w = 20; w <= config.canaryWeight; w += 20) {
    steps.push(`        - setWeight: ${w}`);
    steps.push('        - pause: {duration: 30s}');
  }
  if (config.canaryWeight < 100) {
    steps.push('        - pause: {}');
  }

  const metrics = config.analysisMetrics.map(m => {
    const metric = METRIC_OPTIONS.find(o => o.id === m);
    return `          - name: ${m}
            successCondition: "${metric?.label ?? m}"`;
  });

  return `apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-app
spec:
  replicas: ${config.replicas}
  strategy:
    canary:
      maxSurge: ${config.maxSurge}
      maxUnavailable: ${config.maxUnavailable}
      steps:
${steps.join('\n')}
      analysis:
        templates:
${metrics.join('\n')}
  selector:
    matchLabels:
      app: my-app
  template:
    spec:
      containers:
        - name: my-app
          image: registry/my-app:latest`;
}

function generateBlueGreenYaml(config: BlueGreenConfig): string {
  return `apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: my-app
spec:
  replicas: ${config.activeReplicas}
  strategy:
    blueGreen:
      activeService: my-app-active
      previewService: my-app-preview
      previewReplicaCount: ${config.previewReplicas}
      autoPromotionEnabled: ${config.autoPromotion}
      ${config.autoPromotion ? `autoPromotionSeconds: ${config.autoPromotionSeconds}` : 'scaleDownDelaySeconds: 60'}
  selector:
    matchLabels:
      app: my-app
  template:
    spec:
      containers:
        - name: my-app
          image: registry/my-app:latest`;
}

export default function RolloutConfigurator({strategy: propStrategy, initialConfig}: RolloutConfiguratorProps) {
  const [strategy, setStrategy] = useState<Strategy>(propStrategy ?? 'canary');
  const [canary, setCanary] = useState<CanaryConfig>(initialConfig?.canary ?? DEFAULT_CANARY);
  const [bluegreen, setBluegreen] = useState<BlueGreenConfig>(initialConfig?.bluegreen ?? DEFAULT_BLUEGREEN);
  const [showYaml, setShowYaml] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const yaml = strategy === 'canary' ? generateCanaryYaml(canary) : generateBlueGreenYaml(bluegreen);

  const toggleMetric = (id: string) => {
    setCanary(prev => ({
      ...prev,
      analysisMetrics: prev.analysisMetrics.includes(id)
        ? prev.analysisMetrics.filter(m => m !== id)
        : [...prev.analysisMetrics, id],
    }));
  };

  const startAnimation = useCallback(() => {
    setProgress(0);
    setIsAnimating(true);
    setIsPaused(false);
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  useEffect(() => {
    if (!isAnimating || isPaused) return;
    if (progress >= 100) {
      setIsAnimating(false);
      return;
    }
    const timer = setTimeout(() => {
      setProgress(prev => {
        const next = prev + 20;
        return next > 100 ? 100 : next;
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [isAnimating, isPaused, progress]);

  return (
    <div className="rc">
      <div className="rc__header">
        <h4>Rollout 策略配置器</h4>
        <div className="rc__tabs">
          <button
            className={`rc__tab ${strategy === 'canary' ? 'rc__tab--active' : ''}`}
            onClick={() => setStrategy('canary')}
          >
            Canary 金丝雀
          </button>
          <button
            className={`rc__tab ${strategy === 'bluegreen' ? 'rc__tab--active' : ''}`}
            onClick={() => setStrategy('bluegreen')}
          >
            Blue-Green 蓝绿
          </button>
        </div>
      </div>

      <div className="rc__body">
        <div className="rc__params">
          {strategy === 'canary' ? (
            <>
              <div className="rc__field">
                <label>副本数 (Replicas)</label>
                <div className="rc__slider-row">
                  <input type="range" min={1} max={10} value={canary.replicas}
                    onChange={e => setCanary(p => ({...p, replicas: +e.target.value}))} />
                  <span className="rc__slider-val">{canary.replicas}</span>
                </div>
              </div>
              <div className="rc__field">
                <label>金丝雀流量权重 (Canary Weight)</label>
                <div className="rc__slider-row">
                  <input type="range" min={0} max={100} step={20} value={canary.canaryWeight}
                    onChange={e => setCanary(p => ({...p, canaryWeight: +e.target.value}))} />
                  <span className="rc__slider-val">{canary.canaryWeight}%</span>
                </div>
              </div>
              <div className="rc__field">
                <label>maxSurge</label>
                <div className="rc__slider-row">
                  <input type="range" min={1} max={5} value={canary.maxSurge}
                    onChange={e => setCanary(p => ({...p, maxSurge: +e.target.value}))} />
                  <span className="rc__slider-val">{canary.maxSurge}</span>
                </div>
              </div>
              <div className="rc__field">
                <label>maxUnavailable</label>
                <div className="rc__slider-row">
                  <input type="range" min={0} max={3} value={canary.maxUnavailable}
                    onChange={e => setCanary(p => ({...p, maxUnavailable: +e.target.value}))} />
                  <span className="rc__slider-val">{canary.maxUnavailable}</span>
                </div>
              </div>
              <div className="rc__field">
                <label>AnalysisRun 指标</label>
                <div className="rc__checkboxes">
                  {METRIC_OPTIONS.map(m => (
                    <label key={m.id} className="rc__checkbox">
                      <input type="checkbox" checked={canary.analysisMetrics.includes(m.id)}
                        onChange={() => toggleMetric(m.id)} />
                      <span>{m.label}</span>
                      <span className="rc__checkbox-desc">{m.description}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rc__field">
                <label>Active 副本数</label>
                <div className="rc__slider-row">
                  <input type="range" min={1} max={10} value={bluegreen.activeReplicas}
                    onChange={e => setBluegreen(p => ({...p, activeReplicas: +e.target.value}))} />
                  <span className="rc__slider-val">{bluegreen.activeReplicas}</span>
                </div>
              </div>
              <div className="rc__field">
                <label>Preview 副本数</label>
                <div className="rc__slider-row">
                  <input type="range" min={1} max={10} value={bluegreen.previewReplicas}
                    onChange={e => setBluegreen(p => ({...p, previewReplicas: +e.target.value}))} />
                  <span className="rc__slider-val">{bluegreen.previewReplicas}</span>
                </div>
              </div>
              <div className="rc__field">
                <label className="rc__toggle-label">
                  <input type="checkbox" checked={bluegreen.autoPromotion}
                    onChange={e => setBluegreen(p => ({...p, autoPromotion: e.target.checked}))} />
                  自动晋升 (Auto Promotion)
                </label>
              </div>
              {bluegreen.autoPromotion && (
                <div className="rc__field">
                  <label>自动晋升超时 (秒)</label>
                  <div className="rc__slider-row">
                    <input type="range" min={10} max={120} step={5} value={bluegreen.autoPromotionSeconds}
                      onChange={e => setBluegreen(p => ({...p, autoPromotionSeconds: +e.target.value}))} />
                    <span className="rc__slider-val">{bluegreen.autoPromotionSeconds}s</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="rc__preview">
          <div className="rc__preview-tabs">
            <button className={`rc__tab-sm ${!showYaml ? 'rc__tab-sm--active' : ''}`}
              onClick={() => setShowYaml(false)}>
              发布动画
            </button>
            <button className={`rc__tab-sm ${showYaml ? 'rc__tab-sm--active' : ''}`}
              onClick={() => setShowYaml(true)}>
              YAML 预览
            </button>
          </div>

          {showYaml ? (
            <div className="rc__yaml-panel">
              <pre>{yaml}</pre>
            </div>
          ) : (
            <div className="rc__animation">
              {strategy === 'canary' ? (
                <>
                  <div className="rc__traffic-bar">
                    <div className="rc__traffic-canary" style={{width: `${progress}%`}}>
                      {progress > 10 && `Canary ${progress}%`}
                    </div>
                    <div className="rc__traffic-stable">
                      {progress < 90 && `Stable ${100 - progress}%`}
                    </div>
                  </div>
                  <div className="rc__steps">
                    {CANARY_STEPS.map(s => (
                      <div key={s} className={`rc__step ${progress >= s ? 'rc__step--done' : ''} ${progress === s && isAnimating ? 'rc__step--current' : ''}`}>
                        <span className="rc__step-dot">{s}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rc__bg-visual">
                  <div className={`rc__bg-block rc__bg-active ${progress === 100 ? 'rc__bg-block--preview' : ''}`}>
                    <span>Active (v1)</span>
                    <span className="rc__bg-count">{bluegreen.activeReplicas} pods</span>
                  </div>
                  <div className={`rc__bg-block rc__bg-preview ${progress === 100 ? 'rc__bg-block--active' : ''}`}>
                    <span>Preview (v2)</span>
                    <span className="rc__bg-count">{bluegreen.previewReplicas} pods</span>
                  </div>
                  {progress === 100 && (
                    <div className="rc__bg-switch">✓ 流量已切换至 v2</div>
                  )}
                </div>
              )}
              <div className="rc__anim-controls">
                <button className="rc__btn rc__btn--primary" onClick={startAnimation} disabled={isAnimating && !isPaused}>
                  {isAnimating && !isPaused ? '▶ 发布中...' : '▶ 开始发布'}
                </button>
                {isAnimating && (
                  <button className="rc__btn" onClick={togglePause}>
                    {isPaused ? '▶ 继续' : '⏸ 暂停'}
                  </button>
                )}
                <button className="rc__btn rc__btn--secondary" onClick={() => { setProgress(0); setIsAnimating(false); }}>
                  ↺ 重置
                </button>
              </div>
            </div>
          )}

          <button className="rc__compare-btn" onClick={() => setShowComparison(prev => !prev)}>
            {showComparison ? '隐藏' : '显示'}回滚对比视图
          </button>

          {showComparison && (
            <div className="rc__comparison">
              <div className="rc__compare-col rc__compare-col--stable">
                <h5>稳定版本 (Stable v1)</h5>
                <pre>{strategy === 'canary'
                  ? `replicas: ${canary.replicas}\ncanaryWeight: 0%\nimage: registry/my-app:v1`
                  : `replicas: ${bluegreen.activeReplicas}\nservice: my-app-active\nimage: registry/my-app:v1`}</pre>
              </div>
              <div className="rc__compare-col rc__compare-col--new">
                <h5>新版本 (Canary v2)</h5>
                <pre>{strategy === 'canary'
                  ? `replicas: ${canary.replicas}\ncanaryWeight: ${canary.canaryWeight}%\nimage: registry/my-app:v2`
                  : `replicas: ${bluegreen.previewReplicas}\nservice: my-app-preview\nimage: registry/my-app:v2`}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
