import React, {useState, useMemo} from 'react';
import clsx from 'clsx';

interface DiffLine {
  type: 'same' | 'add' | 'remove';
  oldNum?: number;
  newNum?: number;
  content: string;
}

interface Props {
  oldConfig: string;
  newConfig: string;
  title?: string;
}

function computeLCS(oldLines: string[], newLines: string[]): DiffLine[] {
  const m = oldLines.length;
  const n = newLines.length;

  const dp: number[][] = Array.from({length: m + 1}, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = m, j = n;
  const stack: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      stack.push({type: 'same', oldNum: i, newNum: j, content: oldLines[i - 1]});
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({type: 'add', newNum: j, content: newLines[j - 1]});
      j--;
    } else {
      stack.push({type: 'remove', oldNum: i, content: oldLines[i - 1]});
      i--;
    }
  }

  for (let k = stack.length - 1; k >= 0; k--) {
    result.push(stack[k]);
  }
  return result;
}

export default function ConfigDiffViewer({oldConfig, newConfig, title}: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const diffLines = useMemo(() => computeLCS(oldConfig.split('\n'), newConfig.split('\n')), [oldConfig, newConfig]);

  const changeCount = diffLines.filter((l) => l.type !== 'same').length;
  const sameCount = diffLines.filter((l) => l.type === 'same').length;

  const displayedLines = collapsed
    ? diffLines.filter((line, idx) => {
        if (line.type !== 'same') return true;
        const context = 2;
        for (let offset = 1; offset <= context; offset++) {
          const prev = diffLines[idx - offset];
          const next = diffLines[idx + offset];
          if ((prev && prev.type !== 'same') || (next && next.type !== 'same')) return true;
        }
        return false;
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
                <td className="diff-viewer__num">{line.oldNum ?? ''}</td>
                <td className="diff-viewer__num">{line.newNum ?? ''}</td>
                <td className="diff-viewer__marker">
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                </td>
                <td className="diff-viewer__text">
                  <code>{line.content}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
