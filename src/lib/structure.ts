import * as monaco from 'monaco-editor';
import { mathEnvironments } from './data';
import { StructureAnalyserResult } from './StructureAnalyser';

// Matches \begin{name} with \end{name}.
// Returns the position right after '{' in '\begin{xxx}' or '\end{xxx}'
export function matchEnvironment(
  model: monaco.editor.ITextModel,
  name: string | null,
  start: monaco.IPosition,
  direction: number
): monaco.IPosition | undefined {
  if (direction !== 1 && direction !== -1) return;

  let stack = [name];
  let analyserResult = (model as any)._analyserResult as StructureAnalyserResult;
  if (!analyserResult) return;

  let startIndex = 0;
  let startLine = analyserResult[start.lineNumber];
  while (startIndex < startLine.length && startLine[startIndex].startColumn < start.column)
    startIndex++;
  startIndex--;
  if (!(startLine[startIndex]?.endColumn >= start.column)) return;

  let lineCount = model.getLineCount();
  for (let l = start.lineNumber; l > 0 && l <= lineCount; l += direction) {
    let tokens = analyserResult[l];

    for (
      let i =
        l === start.lineNumber ? startIndex + direction : direction === 1 ? 0 : tokens.length - 1;
      i >= 0 && i < tokens.length;
      i += direction
    ) {
      let match = tokens[i].tag.match(/^\\(begin|end)\{([^\{\}\\]*)\}$/);
      if (!match) continue;

      if ((match[1] === 'begin') === (direction === 1)) {
        stack.push(match[2]);
      } else {
        let name = stack.pop();
        if (name !== null && name !== match[2]) return;
        if (stack.length === 0) {
          return {
            lineNumber: l,
            column: tokens[i].endColumn - match[2].length - 1,
          };
        }
      }
    }
  }
}

export function detectMode(
  model: monaco.editor.ITextModel,
  position: monaco.IPosition
): 'T' | 'M' | null {
  let analyserResult = (model as any)._analyserResult as StructureAnalyserResult;
  if (!analyserResult) return 'T';

  let stack: string[] = [];

  for (let l = 1; l <= position.lineNumber; l++) {
    let tokens = analyserResult[l];
    if (l === position.lineNumber) {
      tokens = tokens.filter((token) => token.endColumn <= position.column);
    }
    for (let i = 0; i < tokens.length; i++) {
      let t = tokens[i];
      if (t.tag === '$') {
        let isDoubleDollar =
          tokens[i + 1]?.tag === '$' && tokens[i + 1]?.startColumn === t.endColumn;
        if (
          stack.length > 0 &&
          (stack[stack.length - 1] === '$' || (isDoubleDollar && stack[stack.length - 1] === '$$'))
        ) {
          stack.pop();
        } else {
          stack.push(isDoubleDollar ? '$$' : '$');
          if (isDoubleDollar) i++;
        }
      } else if (t.tag === '\\(') {
        stack.push('\\(');
      } else if (t.tag === '\\[') {
        stack.push('\\[');
      } else if (t.tag === '\\)') {
        if (stack[stack.length - 1] === '\\(') stack.pop();
      } else if (t.tag === '\\]') {
        if (stack[stack.length - 1] === '\\[') stack.pop();
      } else if (t.tag.startsWith('\\begin')) {
        let env = t.tag.substring(7, t.tag.length - 1);
        if (mathEnvironments.join('|').includes(env) && !env.includes('|')) {
          stack.push(env);
        }
      } else if (t.tag.startsWith('\\end')) {
        let env = t.tag.substring(5, t.tag.length - 1);
        if (stack.length > 0 && stack[stack.length - 1] === env) {
          stack.pop();
        }
      }
    }
  }

  return stack.length > 0 ? 'M' : 'T';
}
