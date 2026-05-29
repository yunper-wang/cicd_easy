import React, {useState} from 'react';

interface Annotation {
  line: number;
  text: string;
}

interface Props {
  code: string;
  annotations: Annotation[];
  title?: string;
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<code key={key++} className="code-annotator__inline-code">{match[4]}</code>);
    } else if (match[5]) {
      parts.push(
        <a key={key++} href={match[7]} target="_blank" rel="noopener noreferrer">{match[6]}</a>
      );
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }
  return parts.length > 0 ? parts : [text];
}

function renderMarkdown(text: string): React.ReactNode[] {
  return text.split('\n').map((line, i) => (
    <React.Fragment key={i}>
      {i > 0 && <br />}
      {renderInlineMarkdown(line)}
    </React.Fragment>
  ));
}

export default function CodeAnnotator({code, annotations, title}: Props): JSX.Element {
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const lines = code.split('\n');
  const annotationMap = new Map(annotations.map((a) => [a.line, a.text]));

  return (
    <div className="code-annotator">
      {title && <div className="code-annotator__title">{title}</div>}
      <div className="code-annotator__layout">
        <div className="code-annotator__code">
          <table>
            <tbody>
              {lines.map((line, idx) => {
                const lineNum = idx + 1;
                const hasAnnotation = annotationMap.has(lineNum);
                const isActive = activeLine === lineNum;
                return (
                  <tr
                    key={idx}
                    className={`code-annotator__line ${
                      hasAnnotation ? 'code-annotator__line--annotated' : ''
                    } ${isActive ? 'code-annotator__line--active' : ''}`}
                    onClick={() => hasAnnotation && setActiveLine(isActive ? null : lineNum)}>
                    <td className="code-annotator__num">{lineNum}</td>
                    <td className="code-annotator__marker">
                      {hasAnnotation ? '●' : ' '}
                    </td>
                    <td className="code-annotator__text">
                      <code>{line}</code>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {activeLine !== null && annotationMap.has(activeLine) && (
          <div className="code-annotator__panel">
            <div className="code-annotator__panel-header">
              第 {activeLine} 行解读
            </div>
            <div className="code-annotator__panel-content">
              {renderMarkdown(annotationMap.get(activeLine)!)}
            </div>
          </div>
        )}
      </div>
      <div className="code-annotator__hint">
        点击 ● 标记的行查看解读
      </div>
    </div>
  );
}
