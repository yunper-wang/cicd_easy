import {useState, useEffect, useCallback} from 'react';

interface StageProgress {
  docsRead: string[];
  quizScores: Record<string, number>;
  componentsUsed: string[];
  completed: boolean;
}

interface ProgressData {
  stages: Record<string, StageProgress>;
  lastVisit: string;
}

const STORAGE_KEY = 'cicd-easy-progress';

const DEFAULT_PROGRESS: ProgressData = {
  stages: {
    stage1: {docsRead: [], quizScores: {}, componentsUsed: [], completed: false},
    stage2: {docsRead: [], quizScores: {}, componentsUsed: [], completed: false},
    stage3: {docsRead: [], quizScores: {}, componentsUsed: [], completed: false},
  },
  lastVisit: new Date().toISOString(),
};

function load(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return {...DEFAULT_PROGRESS, ...data, stages: {...DEFAULT_PROGRESS.stages, ...data.stages}};
    }
  } catch { /* ignore */ }
  return DEFAULT_PROGRESS;
}

function save(data: ProgressData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressData>(load);

  useEffect(() => {
    const updated = {...progress, lastVisit: new Date().toISOString()};
    save(updated);
  }, [progress]);

  const markDocRead = useCallback((stage: string, docId: string) => {
    setProgress((prev) => {
      const stageData = prev.stages[stage] || DEFAULT_PROGRESS.stages.stage1;
      if (stageData.docsRead.includes(docId)) return prev;
      const updated = {
        ...prev,
        stages: {
          ...prev.stages,
          [stage]: {...stageData, docsRead: [...stageData.docsRead, docId]},
        },
      };
      save(updated);
      return updated;
    });
  }, []);

  const saveQuizScore = useCallback((stage: string, quizId: string, score: number) => {
    setProgress((prev) => {
      const stageData = prev.stages[stage] || DEFAULT_PROGRESS.stages.stage1;
      const updated = {
        ...prev,
        stages: {
          ...prev.stages,
          [stage]: {
            ...stageData,
            quizScores: {...stageData.quizScores, [quizId]: Math.max(stageData.quizScores[quizId] || 0, score)},
          },
        },
      };
      save(updated);
      return updated;
    });
  }, []);

  const markComponentUsed = useCallback((stage: string, componentId: string) => {
    setProgress((prev) => {
      const stageData = prev.stages[stage] || DEFAULT_PROGRESS.stages.stage1;
      if (stageData.componentsUsed.includes(componentId)) return prev;
      const updated = {
        ...prev,
        stages: {
          ...prev.stages,
          [stage]: {...stageData, componentsUsed: [...stageData.componentsUsed, componentId]},
        },
      };
      save(updated);
      return updated;
    });
  }, []);

  const getStagePercent = useCallback((stage: string): number => {
    const stageData = progress.stages[stage];
    if (!stageData) return 0;
    let total = 0;
    let done = 0;
    if (stageData.docsRead.length > 0 || stage === 'stage1') { total += 4; done += Math.min(stageData.docsRead.length, 4); }
    if (Object.keys(stageData.quizScores).length > 0 || stage === 'stage1') { total += 1; done += Object.keys(stageData.quizScores).length > 0 ? 1 : 0; }
    if (stageData.componentsUsed.length > 0 || stage === 'stage1') { total += 2; done += Math.min(stageData.componentsUsed.length, 2); }
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [progress]);

  const getOverallPercent = useCallback((): number => {
    const stages = ['stage1', 'stage2', 'stage3'];
    const total = stages.reduce((sum, s) => sum + getStagePercent(s), 0);
    return Math.round(total / stages.length);
  }, [getStagePercent]);

  const reset = useCallback(() => {
    setProgress(DEFAULT_PROGRESS);
    save(DEFAULT_PROGRESS);
  }, []);

  return {
    progress,
    markDocRead,
    saveQuizScore,
    markComponentUsed,
    getStagePercent,
    getOverallPercent,
    reset,
  };
}
