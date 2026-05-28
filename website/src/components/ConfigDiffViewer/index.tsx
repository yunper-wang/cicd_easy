import React, {useState, useMemo} from 'react';
import clsx from 'clsx';

interface DiffLine {
  type: 'same' | 'add' | 'remove' | 'change';
  oldNum?: number;
  newNum?: number;
  content: string;
  oldContent?: string;
}

interface Props {
  oldConfig: string;
  newConfig: string;
  title?: string;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  let oldIdx = 0;
  let newIdx = 0;

  // Simple line-by-line diff
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldIdx < oldLines.length ? oldLines[oldIdx] : undefined;
    const newLine = newIdx < newLines.length ? newLines[newIdx] : undefined;

    if (oldLine === newLine) {
      result.push({type: 'same', oldNum: oldIdx + 1, newNum: newIdx + 1, content: oldLine});
      oldIdx++;
      newIdx++;
    } else {
      // Look ahead to find where lines match again
      let foundMatch = false;
      for (let ahead = 1; ahead <= 3; ahead++) {
        if (oldIdx + ahead < oldLines.length && oldLines[oldIdx + ahead] === newLine) {
          // Old has extra lines
          for (let j = 0; j < ahead; j++) {
            result.push({type: 'remove', oldNum: oldIdx + 1, content: oldLines[oldIdx]});
            oldIdx++;
          }
          result.push({type: 'add', newNum: newIdx + 1, content: newLines[newIdx]});
          newIdx++;
          foundMatch = true;
          break;
        }
        if (newIdx + ahead < newLines.length && newLines[newIdx + ahead] === oldLine) {
          // New has extra lines
          for (let j = 0; j < ahead; j++) {
            result.push({type: 'add', newNum: newIdx + 1, content: newLines[newIdx]});
            newIdx++;
          }
          result.push({type: 'same', oldNum: oldIdx + 1, newNum: newIdx + 1, content: oldLine});
          oldIdx++;
          newIdx++;
          foundMatch = true;
          break;
        }
      }

      if (!foundMatch) {
        result.push({type: 'change', oldNum: oldIdx + 1, newNum: newIdx + 1, content: newLine, oldContent: oldLine});
        oldIdx++;
        newIdx++;
      }
    }
  }

  return result;
}

export default function ConfigDiffViewer({oldConfig, newConfig, title}: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const diffLines = useMemo(() => computeDiff(oldConfig, newConfig), [oldConfig, newConfig]);

  const changeCount = diffLines.filter((l) => l.type !== 'same').length;
  const sameCount = diffLines.filter((l) => l.type === 'same').length;

  const displayedLines = collapsed
    ? diffLines.filter((line, idx) => {
        if (line.type !== 'same') return true;
        // Show context around changes (2 lines before and after)
        const prev = diffLines[idx - 1];
        const prev2 = diffLines[idx - 2];
        const next = diffLines[idx + 1];
        const next2 = diffLines[idx + 2];
        return (
          (prev && prev.type !== 'same') ||
          (prev2 && prev2.type !== 'same') ||
          (next && next.type !== 'same') ||
          (next2 && next2.type !== 'same')
        );
      })
    : diffLines;

  return (
    <div className="diff-viewer">
      {title && (
        <div className="diff-viewer__header">
          <h4>{title}</h4>
          <span className="diff-viewer__stats">
            {changeCount} 行变更, {sameCount} 行不变
          </span>
        </div>
      )}
      <div className="diff-viewer__toolbar">
        <button
          className={clsx('button', 'button--sm', collapsed ? 'button--primary' : 'button--secondary')}
          onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '展开全部' : '折叠未变更'}
        </button>
      </div>
      {collapsed && (
        <div className="diff-viewer__collapsed-hint">
          已隐藏 {sameCount - displayedLines.filter((l) => l.type === 'same').length} 行未变更内容
        </div>
      )}
      <div className="diff-viewer__content">
        <table className="diff-viewer__table">
          <tbody>
            {displayedLines.map((line, idx) => (
              <tr key={idx} className={clsx('diff-viewer__line', `diff-viewer__line--${line.type}`)}>
                <td className="diff-viewer__num diff-viewer__num--old">{line.oldNum ?? ''}</td>
                <td className="diff-viewer__num diff-viewer__num--new">{line.newNum ?? ''}</td>
                <td className="diff-viewer__marker">
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : line.type === 'change' ? '~' : ' '}
                </td>
                <td className="diff-viewer__text">
                  <code>{line.content}</code>
                  {line.type === 'change' && line.oldContent && (
                    <div className="diff-viewer__old-line">
                      <code>{line.oldContent}</code>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
