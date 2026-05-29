import React, {useState, useCallback, useMemo, useEffect} from 'react';

interface ValidationError {
  line: number;
  severity: 'error' | 'warning';
  message: string;
  suggestion?: string;
}

interface ParsedLine {
  lineNum: number;
  raw: string;
  indent: number;
  key?: string;
  value?: string;
  type: 'stage-def' | 'job' | 'job-key' | 'variable' | 'comment' | 'empty' | 'other';
  parentJob?: string;
}

export interface CIConfigEditorProps {
  initialYaml?: string;
  onValidChange?: (yaml: string, valid: boolean) => void;
}

const TOP_LEVEL_KEYS = new Set([
  'stages', 'variables', 'include', 'image', 'before_script', 'after_script',
  'services', 'cache', 'workflow', 'default',
]);

const JOB_KEYS = new Set([
  'stage', 'script', 'image', 'variables', 'only', 'except', 'artifacts',
  'cache', 'needs', 'rules', 'trigger', 'extends', 'before_script',
  'after_script', 'services', 'tags', 'allow_failure', 'when', 'retry',
  'timeout', 'interruptible', 'resource_group', 'environment', 'coverage',
  'inherit', 'secrets', 'identity',
]);

const CI_PREDEFINED_VARS = new Set([
  '$CI_COMMIT_SHA', '$CI_COMMIT_SHORT_SHA', '$CI_COMMIT_BRANCH',
  '$CI_COMMIT_TAG', '$CI_PIPELINE_ID', '$CI_PIPELINE_IID',
  '$CI_JOB_ID', '$CI_JOB_NAME', '$CI_JOB_STAGE',
  '$CI_REGISTRY', '$CI_REGISTRY_IMAGE', '$CI_REGISTRY_USER', '$CI_REGISTRY_PASSWORD',
  '$CI_PROJECT_ID', '$CI_PROJECT_NAME', '$CI_PROJECT_PATH',
  '$CI_ENVIRONMENT_NAME', '$CI_ENVIRONMENT_URL',
  '$CI_MERGE_REQUEST_ID', '$CI_MERGE_REQUEST_IID',
]);

const DEFAULT_YAML = `stages:
  - build
  - test
  - deploy

variables:
  APP_NAME: my-app
  REGISTRY: \$CI_REGISTRY_IMAGE

build-image:
  stage: build
  image: docker:24-dind
  script:
    - docker build -t \$REGISTRY/\$APP_NAME:\$CI_COMMIT_SHORT_SHA .
    - docker push \$REGISTRY/\$APP_NAME:\$CI_COMMIT_SHORT_SHA
  only:
    - main

run-tests:
  stage: test
  image: node:18-alpine
  script:
    - npm ci
    - npm test
  artifacts:
    reports:
      junit: test-results.xml

deploy-prod:
  stage: deploy
  image: bitnami/kubectl
  script:
    - kubectl apply -f k8s/
    - kubectl rollout status deployment/\$APP_NAME
  only:
    - main
  when: manual
`;

function parseLines(input: string): ParsedLine[] {
  const lines = input.split('\n');
  return lines.map((raw, i) => {
    const lineNum = i + 1;
    const trimmed = raw.trimStart();

    if (trimmed === '' || trimmed.startsWith('#')) {
      return {lineNum, raw, indent: raw.length - trimmed.length, type: trimmed === '' ? 'empty' : 'comment'};
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
      return {lineNum, raw, indent: raw.length - trimmed.length, type: 'other'};
    }

    const key = trimmed.substring(0, colonIdx).trim();
    const value = trimmed.substring(colonIdx + 1).trim();
    const indent = raw.length - trimmed.length;

    let type: ParsedLine['type'] = 'other';
    if (key === 'stages' && indent === 0) type = 'stage-def';
    else if (indent === 0 && !TOP_LEVEL_KEYS.has(key)) type = 'job';
    else if (indent >= 2) type = 'job-key';
    else if (key === 'variables') type = 'variable';

    return {lineNum, raw, indent, key, value, type};
  });
}

function validate(parsed: ParsedLine[], raw: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const stages = new Set<string>();
  const jobs: string[] = [];
  const userVars = new Set<string>();
  let hasStagesDef = false;

  for (const line of parsed) {
    if (line.type === 'stage-def') {
      hasStagesDef = true;
      const val = line.value;
      if (val) {
        const stageList = val.replace(/[[\]]/g, '').split(',').map(s => s.trim().replace(/['"]/g, ''));
        stageList.filter(Boolean).forEach(s => stages.add(s));
      }
    }
    if (line.type === 'job' && line.key) {
      jobs.push(line.key);
    }
  }

  let currentJob: string | null = null;
  const lines = raw.split('\n');

  for (let i = 0; i < parsed.length; i++) {
    const line = parsed[i];
    if (line.type === 'empty' || line.type === 'comment') continue;

    if (line.type === 'job' && line.key) {
      currentJob = line.key;
      if (TOP_LEVEL_KEYS.has(line.key)) {
        errors.push({
          line: line.lineNum,
          severity: 'error',
          message: `"${line.key}" is a reserved top-level keyword, not a job name`,
          suggestion: `Rename this job to something like "job-${line.key}" or move it to the correct indent level`,
        });
      }
    }

    if (line.type === 'job-key' && line.key === 'stage' && line.value && currentJob) {
      const stageName = line.value.replace(/['"]/g, '');
      if (hasStagesDef && stages.size > 0 && !stages.has(stageName)) {
        errors.push({
          line: line.lineNum,
          severity: 'error',
          message: `Job "${currentJob}" references undefined stage "${stageName}"`,
          suggestion: `Add "${stageName}" to the stages list, or use one of: ${[...stages].join(', ')}`,
        });
      }
    }

    const varRefs = lines[line.lineNum - 1].match(/\$[A-Z_]+/g);
    if (varRefs) {
      for (const ref of varRefs) {
        if (!CI_PREDEFINED_VARS.has(ref) && !userVars.has(ref)) {
          errors.push({
            line: line.lineNum,
            severity: 'warning',
            message: `Variable ${ref} is not defined in this file or in CI predefined variables`,
            suggestion: `Define ${ref} in the variables section or verify it's set in GitLab CI/CD settings`,
          });
        }
      }
    }

    if (line.key === 'variables' && line.value && line.value.includes('=')) {
      const varName = line.value.split('=')[0].trim().replace(/^\$/, '');
      userVars.add('$' + varName);
    }
  }

  if (jobs.length > 0 && !hasStagesDef) {
    errors.push({
      line: 1,
      severity: 'warning',
      message: 'No "stages" definition found. All jobs will use the default stage order.',
      suggestion: 'Add a "stages:" block at the top of your config to define the pipeline stage order.',
    });
  }

  const knownTopLevel = new Set([...TOP_LEVEL_KEYS, ...jobs]);
  for (const line of parsed) {
    if (line.type === 'other' && line.indent === 0 && line.key && !knownTopLevel.has(line.key)) {
      const isLikelyJob = parsed.some(l => l.type === 'job-key' && l.indent > 0 &&
        Math.abs(l.lineNum - line.lineNum) <= 10);
      if (!isLikelyJob) {
        errors.push({
          line: line.lineNum,
          severity: 'warning',
          message: `Unknown top-level key "${line.key}"`,
          suggestion: `Check if "${line.key}" is a valid GitLab CI keyword or a job definition missing its indent`,
        });
      }
    }
  }

  errors.sort((a, b) => a.line - b.line);
  return errors;
}

function buildStructureTree(parsed: ParsedLine[]): string {
  let tree = '';
  let currentJob: string | null = null;

  for (const line of parsed) {
    if (line.type === 'empty' || line.type === 'comment') continue;

    if (line.type === 'stage-def') {
      tree += 'stages:\n';
      if (line.value) {
        const stages = line.value.replace(/[[\]]/g, '').split(',').map(s => s.trim().replace(/['"]/g, ''));
        stages.filter(Boolean).forEach(s => { tree += `  └─ ${s}\n`; });
      }
    } else if (line.type === 'job' && line.key) {
      currentJob = line.key;
      tree += `\n${line.key}:\n`;
    } else if (line.type === 'job-key' && line.key && currentJob) {
      tree += `  ├─ ${line.key}`;
      if (line.value) tree += `: ${line.value.length > 30 ? line.value.substring(0, 30) + '...' : line.value}`;
      tree += '\n';
    } else if (line.type === 'variable' && line.value) {
      const v = line.value.split('=')[0]?.trim();
      if (v) tree += `  └─ ${v}\n`;
    }
  }

  return tree || '(empty)';
}

export default function CIConfigEditor({initialYaml, onValidChange}: CIConfigEditorProps) {
  const [yaml, setYaml] = useState(initialYaml ?? DEFAULT_YAML);
  const [activeTab, setActiveTab] = useState<'errors' | 'tree'>('errors');

  const parsed = useMemo(() => parseLines(yaml), [yaml]);
  const errors = useMemo(() => validate(parsed, yaml), [parsed, yaml]);
  const tree = useMemo(() => buildStructureTree(parsed), [parsed]);
  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;
  const isValid = errorCount === 0;

  useEffect(() => {
    onValidChange?.(yaml, isValid);
  }, [yaml, isValid, onValidChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setYaml(e.target.value);
  }, []);

  const lines = yaml.split('\n');
  const errorLines = new Set(errors.filter(e => e.severity === 'error').map(e => e.line));

  return (
    <div className="ci-editor">
      <div className="ci-editor__header">
        <h4>CI 配置编辑器</h4>
        <div className="ci-editor__status">
          {isValid
            ? <span className="ci-editor__badge ci-editor__badge--valid">✓ 配置有效</span>
            : <span className="ci-editor__badge ci-editor__badge--invalid">✗ {errorCount} 错误</span>
          }
          {warningCount > 0 && (
            <span className="ci-editor__badge ci-editor__badge--warning">⚠ {warningCount} 警告</span>
          )}
        </div>
      </div>
      <div className="ci-editor__body">
        <div className="ci-editor__editor-pane">
          <div className="ci-editor__line-numbers">
            {lines.map((_, i) => (
              <div
                key={i}
                className={`ci-editor__line-num ${errorLines.has(i + 1) ? 'ci-editor__line-num--error' : ''}`}
              >
                {i + 1}
              </div>
            ))}
          </div>
          <textarea
            className="ci-editor__textarea"
            value={yaml}
            onChange={handleChange}
            spellCheck={false}
            aria-label="YAML 编辑区"
          />
        </div>
        <div className="ci-editor__side-pane">
          <div className="ci-editor__tabs">
            <button
              className={`ci-editor__tab ${activeTab === 'errors' ? 'ci-editor__tab--active' : ''}`}
              onClick={() => setActiveTab('errors')}
            >
              校验结果 ({errors.length})
            </button>
            <button
              className={`ci-editor__tab ${activeTab === 'tree' ? 'ci-editor__tab--active' : ''}`}
              onClick={() => setActiveTab('tree')}
            >
              结构预览
            </button>
          </div>
          {activeTab === 'errors' ? (
            <div className="ci-editor__errors">
              {errors.length === 0 ? (
                <div className="ci-editor__no-errors">
                  <p>✓ 没有发现错误或警告</p>
                  <p className="ci-editor__hint">编辑左侧 YAML 代码即可实时校验</p>
                </div>
              ) : (
                errors.map((err, i) => (
                  <div
                    key={i}
                    className={`ci-editor__error ci-editor__error--${err.severity}`}
                  >
                    <div className="ci-editor__error-header">
                      <span className="ci-editor__error-badge">
                        {err.severity === 'error' ? '✗' : '⚠'}
                      </span>
                      <span className="ci-editor__error-line">第 {err.line} 行</span>
                    </div>
                    <div className="ci-editor__error-msg">{err.message}</div>
                    {err.suggestion && (
                      <div className="ci-editor__error-suggestion">
                        💡 {err.suggestion}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="ci-editor__tree">
              <pre>{tree}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
