import React, {useState, useEffect, useCallback} from 'react';

export type JobStatus = 'pending' | 'running' | 'success' | 'failed';

export interface Job {
  name: string;
  status: JobStatus;
  script?: string[];
  log?: string[];
  duration?: string;
}

export interface PipelineStage {
  name: string;
  jobs: Job[];
  status: JobStatus;
  duration?: string;
}

export interface PipelineConfig {
  stages: PipelineStage[];
}

export interface PipelineVisualizerProps {
  pipeline?: PipelineConfig;
  autoRun?: boolean;
}

const SIMULATED_LOGS: Record<string, string[]> = {
  'build-image': [
    '$ docker build -t registry.example.com/my-app:abc1234 .',
    'Step 1/5 : FROM node:18-alpine',
    'Step 2/5 : WORKDIR /app',
    'Step 3/5 : COPY package*.json ./',
    'Step 4/5 : RUN npm ci --production',
    'Step 5/5 : COPY . .',
    'Successfully built abc1234def',
    'Successfully tagged registry.example.com/my-app:abc1234',
    '$ docker push registry.example.com/my-app:abc1234',
    'The push refers to repository [registry.example.com/my-app]',
    'abc1234: digest: sha256:e3b0c4... size: 1234',
    'Job succeeded in 1m 23s',
  ],
  'canary-deploy': [
    '$ kubectl argo rollouts set image my-app my-app=registry/my-app:v2',
    'Rollout "my-app" image updated',
    '$ kubectl argo rollouts status my-app --watch',
    'Pod my-app-canary-abc123 ready',
    'AnalysisRun canary-check-001 running...',
    '  metric: success-rate → 97.2% (threshold: 99%)',
    '  metric: latency-p99 → 890ms (threshold: 500ms)',
    'AnalysisRun canary-check-001 FAILED',
    '  success-rate below threshold (97.2% < 99%)',
    '  latency-p99 above threshold (890ms > 500ms)',
    'Rollout aborted — reverting to stable',
    'Job failed (canary analysis failed)',
  ],
};

const DEFAULT_PIPELINE: PipelineConfig = {
  stages: [
    {
      name: 'build',
      status: 'pending',
      jobs: [{name: 'build-image', status: 'pending', duration: '1m 23s'}],
    },
    {
      name: 'test',
      status: 'pending',
      jobs: [
        {name: 'run-tests', status: 'pending', duration: '2m 05s'},
        {name: 'lint-check', status: 'pending', duration: '0m 45s'},
      ],
    },
    {
      name: 'staging',
      status: 'pending',
      jobs: [{name: 'deploy-staging', status: 'pending', duration: '0m 52s'}],
    },
    {
      name: 'canary',
      status: 'pending',
      jobs: [{name: 'canary-deploy', status: 'pending', duration: '3m 10s'}],
    },
    {
      name: 'production',
      status: 'pending',
      jobs: [{name: 'deploy-prod', status: 'pending', duration: '1m 08s'}],
    },
  ],
};

const STATUS_LABELS: Record<JobStatus, string> = {
  pending: '等待中',
  running: '运行中',
  success: '成功',
  failed: '失败',
};

export default function PipelineVisualizer({pipeline: propPipeline, autoRun = false}: PipelineVisualizerProps) {
  const [pipeline, setPipeline] = useState<PipelineConfig>(propPipeline ?? DEFAULT_PIPELINE);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [currentStageIdx, setCurrentStageIdx] = useState(-1);

  const resetPipeline = useCallback(() => {
    const base = propPipeline ?? DEFAULT_PIPELINE;
    setPipeline({
      stages: base.stages.map(s => ({
        ...s,
        status: 'pending' as JobStatus,
        duration: undefined,
        jobs: s.jobs.map(j => ({...j, status: 'pending' as JobStatus})),
      })),
    });
    setCurrentStageIdx(-1);
    setIsRunning(false);
    setExpandedJob(null);
  }, [propPipeline]);

  useEffect(() => {
    if (autoRun && !isRunning && currentStageIdx === -1) {
      const timer = setTimeout(runPipeline, 500);
      return () => clearTimeout(timer);
    }
  }, [autoRun]);

  const runPipeline = () => {
    resetPipeline();
    setIsRunning(true);
    setCurrentStageIdx(0);
  };

  useEffect(() => {
    if (!isRunning || currentStageIdx < 0 || currentStageIdx >= pipeline.stages.length) return;

    const stage = pipeline.stages[currentStageIdx];
    setPipeline(prev => {
      const updated = {...prev, stages: [...prev.stages]};
      updated.stages[currentStageIdx] = {...stage, status: 'running'};
      return updated;
    });

    const willFail = currentStageIdx === 3;

    const runTimer = setTimeout(() => {
      setPipeline(prev => {
        const updated = {...prev, stages: [...prev.stages]};
        const current = {...updated.stages[currentStageIdx]};

        current.jobs = current.jobs.map(j => {
          if (willFail) {
            return {...j, status: 'failed' as JobStatus, log: SIMULATED_LOGS[j.name] ?? ['Error: Job failed']};
          }
          return {...j, status: 'success' as JobStatus};
        });

        current.status = willFail && current.jobs.some(j => j.status === 'failed') ? 'failed' : 'success';
        current.duration = current.jobs[0]?.duration ?? '0m 30s';

        updated.stages[currentStageIdx] = current;

        if (current.status === 'failed') {
          setIsRunning(false);
          return updated;
        }

        if (currentStageIdx < updated.stages.length - 1) {
          setCurrentStageIdx(currentStageIdx + 1);
        } else {
          setIsRunning(false);
        }

        return updated;
      });
    }, 1500);

    return () => clearTimeout(runTimer);
  }, [currentStageIdx, isRunning]);

  const toggleJobLog = (jobName: string) => {
    setExpandedJob(prev => prev === jobName ? null : jobName);
  };

  return (
    <div className="pv">
      <div className="pv__header">
        <h4>Pipeline 可视化</h4>
        <div className="pv__controls">
          <button
            className="pv__btn"
            onClick={isRunning ? undefined : runPipeline}
            disabled={isRunning}
          >
            {isRunning ? '▶ 运行中...' : '▶ 运行 Pipeline'}
          </button>
          <button className="pv__btn pv__btn--secondary" onClick={resetPipeline}>
            ↺ 重置
          </button>
        </div>
      </div>

      <div className="pv__dag">
        {pipeline.stages.map((stage, si) => (
          <React.Fragment key={stage.name}>
            {si > 0 && (
              <div className={`pv__arrow ${pipeline.stages[si - 1].status !== 'pending' ? 'pv__arrow--active' : ''}`}>
                →
              </div>
            )}
            <div className={`pv__stage pv__stage--${stage.status}`}>
              <div className="pv__stage-name">{stage.name}</div>
              <div className="pv__jobs">
                {stage.jobs.map(job => (
                  <div key={job.name}>
                    <div
                      className={`pv__job pv__job--${job.status} ${job.status === 'failed' ? 'pv__job--clickable' : ''}`}
                      onClick={job.status === 'failed' ? () => toggleJobLog(job.name) : undefined}
                    >
                      <span className="pv__job-status">
                        {job.status === 'pending' && '○'}
                        {job.status === 'running' && '◉'}
                        {job.status === 'success' && '✓'}
                        {job.status === 'failed' && '✗'}
                      </span>
                      <span className="pv__job-name">{job.name}</span>
                      {stage.status !== 'pending' && job.duration && (
                        <span className="pv__job-time">{job.duration}</span>
                      )}
                    </div>
                    {expandedJob === job.name && job.log && (
                      <div className="pv__log-panel">
                        <div className="pv__log-header">
                          <span>{job.name} 日志</span>
                          <button className="pv__log-close" onClick={() => setExpandedJob(null)}>✕</button>
                        </div>
                        <pre className="pv__log-content">
                          {job.log.map((line, li) => (
                            <div key={li} className={`pv__log-line ${line.includes('FAIL') || line.includes('failed') ? 'pv__log-line--error' : ''}`}>
                              {line}
                            </div>
                          ))}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {stage.status !== 'pending' && (
                <div className="pv__stage-duration">
                  {STATUS_LABELS[stage.status]}
                  {stage.duration && ` · ${stage.duration}`}
                </div>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="pv__legend">
        <span className="pv__legend-item"><span className="pv__legend-dot pv__legend-dot--pending" />等待中</span>
        <span className="pv__legend-item"><span className="pv__legend-dot pv__legend-dot--running" />运行中</span>
        <span className="pv__legend-item"><span className="pv__legend-dot pv__legend-dot--success" />成功</span>
        <span className="pv__legend-item"><span className="pv__legend-dot pv__legend-dot--failed" />失败</span>
      </div>
    </div>
  );
}
