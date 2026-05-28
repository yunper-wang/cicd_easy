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
              {annotationMap.get(activeLine)}
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
