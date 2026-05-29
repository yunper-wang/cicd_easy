import React, {useState, useCallback} from 'react';

interface StageNode {
  id: string;
  name: string;
  jobs: string[];
}

const STAGE_TEMPLATES: Omit<StageNode, 'id'>[] = [
  {name: 'Build', jobs: ['build-image']},
  {name: 'Test', jobs: ['run-tests', 'lint-check']},
  {name: 'Security Scan', jobs: ['vulnerability-scan']},
  {name: 'Staging', jobs: ['deploy-staging']},
  {name: 'Canary', jobs: ['canary-deploy']},
  {name: 'Production', jobs: ['deploy-prod']},
];

let nextId = 1;

function generateYaml(stages: StageNode[]): string {
  if (stages.length === 0) return '# 拖拽左侧的 Stage 到这里开始编排';

  const stageNames = stages.map((s) => `  - ${s.name.toLowerCase()}`).join('\n');
  const jobs = stages.map((s) => {
    const scripts = s.jobs.map((j) => `      - echo "Running ${j}"`).join('\n');
    return `${s.name.toLowerCase().replace(/[\s]+/g, '-')}:
  stage: ${s.name.toLowerCase()}
  script:
${scripts || '      - echo "empty job"'}`;
  }).join('\n\n');

  return `stages:
${stageNames}

${jobs}
`;
}

export default function DragDropPipeline(): JSX.Element {
  const [stages, setStages] = useState<StageNode[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const addStage = useCallback((template: Omit<StageNode, 'id'>) => {
    setStages((prev) => [...prev, {...template, id: `stage-${nextId++}`}]);
  }, []);

  const removeStage = useCallback((id: string) => {
    setStages((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const moveStage = useCallback((fromIdx: number, toIdx: number) => {
    setStages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      return updated;
    });
    setDragIdx(null);
  }, []);

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetIdx: number) => {
    if (dragIdx !== null && dragIdx !== targetIdx) {
      moveStage(dragIdx, targetIdx);
    } else {
      setDragIdx(null);
    }
  };

  const yaml = generateYaml(stages);

  return (
    <div className="dd-pipeline">
      <div className="dd-pipeline__header">
        <h4>Pipeline 编排器</h4>
        <span className="dd-pipeline__hint">拖拽 Stage 模板到编排区域，拖拽已添加的 Stage 可调整顺序</span>
      </div>
      <div className="dd-pipeline__body">
        <div className="dd-pipeline__palette">
          <div className="dd-pipeline__palette-title">Stage 模板</div>
          {STAGE_TEMPLATES.map((tmpl, idx) => (
            <div
              key={idx}
              className="dd-pipeline__template"
              draggable
              onDragEnd={() => addStage(tmpl)}>
              <span className="dd-pipeline__template-name">{tmpl.name}</span>
              <span className="dd-pipeline__template-jobs">{tmpl.jobs.length} job{tmpl.jobs.length > 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>
        <div className="dd-pipeline__canvas">
          <div className="dd-pipeline__canvas-title">编排区域</div>
          {stages.length === 0 ? (
            <div
              className="dd-pipeline__empty"
              onDragOver={handleDragOver}
              onDrop={() => addStage(STAGE_TEMPLATES[0])}>
              拖拽 Stage 模板到这里
            </div>
          ) : (
            <div className="dd-pipeline__stages">
              {stages.map((stage, idx) => (
                <React.Fragment key={stage.id}>
                  <div
                    className={`dd-pipeline__stage ${dragIdx === idx ? 'dd-pipeline__stage--dragging' : ''}`}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={() => setDragIdx(null)}>
                    <div className="dd-pipeline__stage-header">
                      <span className="dd-pipeline__stage-name">{stage.name}</span>
                      <button
                        className="dd-pipeline__stage-remove"
                        onClick={() => removeStage(stage.id)}>
                        ✕
                      </button>
                    </div>
                    <div className="dd-pipeline__stage-jobs">
                      {stage.jobs.map((job) => (
                        <span key={job} className="dd-pipeline__job-tag">{job}</span>
                      ))}
                    </div>
                  </div>
                  {idx < stages.length - 1 && (
                    <div className="dd-pipeline__connector">→</div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
        <div className="dd-pipeline__yaml">
          <div className="dd-pipeline__yaml-title">生成的 .gitlab-ci.yml</div>
          <pre className="dd-pipeline__yaml-content"><code>{yaml}</code></pre>
        </div>
      </div>
    </div>
  );
}
