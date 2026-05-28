import React, {useState} from 'react';

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Props {
  title?: string;
  questions: Question[];
}

export default function Quiz({title, questions}: Props): JSX.Element {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleSelect = (idx: number) => {
    if (showResult) return;
    setSelected(idx);
  };

  const handleSubmit = () => {
    if (selected === null) return;
    setShowResult(true);
    if (selected === questions[currentQ].correctIndex) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
      setShowResult(false);
    } else {
      setFinished(true);
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
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="quiz">
        {title && <h4>{title}</h4>}
        <div className="quiz__result">
          <div className={`quiz__score ${percentage >= 80 ? 'quiz__score--pass' : 'quiz__score--fail'}`}>
            {percentage}%
          </div>
          <p>得分: {score}/{questions.length}</p>
          <p>{percentage >= 80 ? '太棒了! 你已经掌握了这些概念。' : '继续加油! 建议重新阅读相关章节。'}</p>
          <button className="button button--primary button--sm" onClick={handleRestart}>
            重新测试
          </button>
        </div>
      </div>
    );
  }

  const q = questions[currentQ];

  return (
    <div className="quiz">
      {title && <h4>{title}</h4>}
      <div className="quiz__progress">
        问题 {currentQ + 1} / {questions.length}
        <div className="quiz__progress-bar">
          <div
            className="quiz__progress-fill"
            style={{width: `${((currentQ + 1) / questions.length) * 100}%`}}
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
            {currentQ < questions.length - 1 ? '下一题' : '查看结果'}
          </button>
        )}
      </div>
    </div>
  );
}
