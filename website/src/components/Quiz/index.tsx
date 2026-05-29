import React, {useState, useMemo, useEffect} from 'react';

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  docLink?: string;
}

interface Props {
  title?: string;
  quizId: string;
  questions: Question[];
  shuffle?: boolean;
}

function shuffleArray<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function loadHistory(quizId: string): {bestScore: number; attempts: number} {
  try {
    const raw = localStorage.getItem(`quiz-${quizId}`);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {bestScore: 0, attempts: 0};
}

function saveHistory(quizId: string, score: number, total: number) {
  const prev = loadHistory(quizId);
  const percentage = Math.round((score / total) * 100);
  const data = {
    bestScore: Math.max(prev.bestScore, percentage),
    attempts: prev.attempts + 1,
  };
  localStorage.setItem(`quiz-${quizId}`, JSON.stringify(data));
}

interface ShuffledQ {
  originalCorrectIndex: number;
  optionMap: number[];
}

function buildShuffledQuestions(
  questions: Question[],
  doShuffle: boolean,
): {shuffled: Question[]; meta: ShuffledQ[]} {
  if (!doShuffle) {
    return {
      shuffled: questions,
      meta: questions.map((q) => ({
        originalCorrectIndex: q.correctIndex,
        optionMap: q.options.map((_, i) => i),
      })),
    };
  }
  const seed = Date.now();
  const meta: ShuffledQ[] = [];
  const shuffled = questions.map((q) => {
    const indices = q.options.map((_, i) => i);
    const perm = shuffleArray(indices, seed + q.correctIndex * 17);
    const newOptions = perm.map((i) => q.options[i]);
    const newCorrect = perm.indexOf(q.correctIndex);
    meta.push({originalCorrectIndex: q.correctIndex, optionMap: perm});
    return {...q, options: newOptions, correctIndex: newCorrect};
  });
  return {shuffled, meta};
}

export default function Quiz({title, quizId, questions, shuffle = true}: Props): JSX.Element {
  const [seed] = useState(() => Date.now());
  const {shuffled, meta} = useMemo(
    () => buildShuffledQuestions(questions, shuffle),
    [questions, shuffle, seed],
  );

  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [history, setHistory] = useState(loadHistory(quizId));

  useEffect(() => {
    setHistory(loadHistory(quizId));
  }, [quizId]);

  const handleSelect = (idx: number) => {
    if (showResult) return;
    setSelected(idx);
  };

  const handleSubmit = () => {
    if (selected === null) return;
    setShowResult(true);
    if (selected === shuffled[currentQ].correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentQ < shuffled.length - 1) {
      setCurrentQ((q) => q + 1);
      setSelected(null);
      setShowResult(false);
    } else {
      setFinished(true);
      const finalScore = score + (selected === shuffled[currentQ].correctIndex ? 1 : 0);
      saveHistory(quizId, finalScore, shuffled.length);
      setHistory(loadHistory(quizId));
    }
  };

  const handleRestart = () => {
    setCurrentQ(0);
    setSelected(null);
    setShowResult(false);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    const percentage = Math.round((score / shuffled.length) * 100);
    return (
      <div className="quiz">
        {title && <h4>{title}</h4>}
        <div className="quiz__result">
          <div className={`quiz__score ${percentage >= 80 ? 'quiz__score--pass' : 'quiz__score--fail'}`}>
            {percentage}%
          </div>
          <p>得分: {score}/{shuffled.length}</p>
          <p>{percentage >= 80 ? '太棒了! 你已经掌握了这些概念。' : '继续加油! 建议重新阅读相关章节。'}</p>
          <div className="quiz__history">
            <span>历史最佳: {history.bestScore}%</span>
            <span> | </span>
            <span>已测试 {history.attempts} 次</span>
          </div>
          <button className="button button--primary button--sm" onClick={handleRestart}>
            重新测试
          </button>
        </div>
      </div>
    );
  }

  const q = shuffled[currentQ];

  return (
    <div className="quiz">
      {title && <h4>{title}</h4>}
      {history.attempts > 0 && (
        <div className="quiz__history quiz__history--top">
          历史最佳: {history.bestScore}% (共 {history.attempts} 次)
        </div>
      )}
      <div className="quiz__progress">
        问题 {currentQ + 1} / {shuffled.length}
        <div className="quiz__progress-bar">
          <div
            className="quiz__progress-fill"
            style={{width: `${((currentQ + 1) / shuffled.length) * 100}%`}}
          />
        </div>
      </div>

      <div className="quiz__question">{q.question}</div>

      <div className="quiz__options">
        {q.options.map((opt, idx) => (
          <div
            key={idx}
            className={`quiz__option ${
              selected === idx ? 'quiz__option--selected' : ''
            } ${
              showResult && idx === q.correctIndex ? 'quiz__option--correct' : ''
            } ${
              showResult && selected === idx && idx !== q.correctIndex ? 'quiz__option--wrong' : ''
            }`}
            onClick={() => handleSelect(idx)}>
            <span className="quiz__option-letter">{String.fromCharCode(65 + idx)}</span>
            <span className="quiz__option-text">{opt}</span>
          </div>
        ))}
      </div>

      {showResult && (
        <div className={`quiz__explanation ${selected === q.correctIndex ? 'quiz__explanation--correct' : 'quiz__explanation--wrong'}`}>
          <strong>{selected === q.correctIndex ? '正确!' : '错误'}</strong> {q.explanation}
          {q.docLink && (
            <a className="quiz__doc-link" href={q.docLink} target="_blank" rel="noopener noreferrer">
              查看相关文档 →
            </a>
          )}
        </div>
      )}

      <div className="quiz__actions">
        {!showResult ? (
          <button
            className="button button--primary button--sm"
            disabled={selected === null}
            onClick={handleSubmit}>
            提交答案
          </button>
        ) : (
          <button className="button button--primary button--sm" onClick={handleNext}>
            {currentQ < shuffled.length - 1 ? '下一题' : '查看结果'}
          </button>
        )}
      </div>
    </div>
  );
}
