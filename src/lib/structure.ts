import * as monaco from 'monaco-editor';
import { getString, mathEnvironments } from './data';
import { LineStructureToken, StructureAnalyserResult } from './StructureAnalyser';

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

// Jump over a number of groups.
export function jumpOverGroups(
  model: monaco.editor.ITextModel,
  start: monaco.IPosition,
  groups: number
): monaco.IPosition | undefined {
  if (groups <= 0) return start;

  let analyserResult = (model as any)._analyserResult as StructureAnalyserResult;
  if (!analyserResult) return;

  let startIndex = 0;
  let startLine = analyserResult[start.lineNumber];
  while (startIndex < startLine.length && startLine[startIndex].startColumn < start.column)
    startIndex++;

  let level = 0;
  let lineCount = model.getLineCount();
  for (let l = start.lineNumber; l <= lineCount; l++) {
    let tokens = analyserResult[l];

    for (let i = l === start.lineNumber ? startIndex : 0; i < tokens.length; i++) {
      if (tokens[i].tag === '{') {
        level++;
      } else if (tokens[i].tag === '}') {
        level--;
        if (level === 0) {
          groups--;
          if (groups === 0) return { lineNumber: l, column: tokens[i].startColumn };
        }
        if (level === -1) return;
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
        if (stack.length > 0 && stack[stack.length - 1] === '$') {
          stack.pop();
        } else if (stack.length > 0 && isDoubleDollar && stack[stack.length - 1] === '$$') {
          stack.pop();
          i++;
        } else {
          stack.push(isDoubleDollar ? '$$' : '$');
          if (isDoubleDollar) i++;
        }
      } else if (t.tag === '\\(') {
        stack.push('\\(');
      } else if (t.tag === '\\[') {
        stack.push('\\[');
      } else if (t.tag === '{') {
        stack.push('{');
      } else if (t.tag === '\\)') {
        if (stack[stack.length - 1] === '\\(') stack.pop();
      } else if (t.tag === '\\]') {
        if (stack[stack.length - 1] === '\\[') stack.pop();
      } else if (t.tag === '}') {
        while (stack.length > 0) {
          if (stack.pop() === '{') break;
        }
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
      } else if (t.tag === 'def' || t.tag === 'newenv' || t.tag === 'envdef') {
        // Ignore everything in command definitions
        let otherPosition = jumpOverGroups(
          model,
          { lineNumber: l, column: t.startColumn },
          t.tag === 'def' ? 1 : t.tag === 'newenv' ? 3 : 4
        );

        if (otherPosition) {
          l = otherPosition.lineNumber;
          tokens = analyserResult[l];

          if (
            l > position.lineNumber ||
            (l === position.lineNumber && otherPosition.column >= position.column)
          )
            return 'T';

          if (l === position.lineNumber) {
            tokens = tokens.filter((token) => token.endColumn <= position.column);
          }

          i = 0;
          while (tokens[i] && tokens[i].startColumn <= otherPosition.column) i++;
          i--;
        }
      }
    }
  }

  return stack.filter((t) => t !== '{').length > 0 ? 'M' : 'T';
}

function toRange(
  token: { startColumn: number; endColumn: number },
  lineNumber: number
): monaco.IRange {
  return {
    startLineNumber: lineNumber,
    endLineNumber: lineNumber,
    startColumn: token.startColumn,
    endColumn: token.endColumn,
  };
}

function matchingBracket(bracket: string) {
  return bracket === '{'
    ? '}'
    : bracket === '\\('
    ? '\\)'
    : bracket === '\\['
    ? '\\]'
    : bracket.startsWith('\\begin')
    ? bracket.replace('\\begin', '\\end')
    : '';
}

export function getHighlightBrackets(
  model: monaco.editor.ITextModel,
  position: monaco.IPosition
): monaco.IRange[] {
  let stack: (LineStructureToken & { line: number; highlight?: boolean })[] = [];

  let analyserResult = (model as any)._analyserResult as StructureAnalyserResult;
  if (!analyserResult) return [];

  let lines = model.getLineCount();
  let isAfterCursor = false;
  for (let l = 1; l <= lines; l++) {
    let tokens = analyserResult[l];

    for (let i = 0; i < tokens.length; i++) {
      let t = tokens[i];
      let isCursorInsideToken =
        l === position.lineNumber &&
        t.startColumn <= position.column &&
        t.endColumn >= position.column;

      if (
        !isAfterCursor &&
        (l > position.lineNumber || (l === position.lineNumber && t.startColumn > position.column))
      ) {
        if (stack.length > 0) {
          stack[stack.length - 1].highlight = true;
          isAfterCursor = true;
        } else {
          return [];
        }
      }

      if (t.tag === '$') {
        let isDoubleDollar =
          tokens[i + 1]?.tag === '$' && tokens[i + 1]?.startColumn === t.endColumn;
        if (
          stack.length > 0 &&
          (stack[stack.length - 1].tag === '$' ||
            (isDoubleDollar && stack[stack.length - 1].tag === '$$'))
        ) {
          let isSingleDollar = stack[stack.length - 1].tag === '$';
          isCursorInsideToken ||=
            !isSingleDollar && l === position.lineNumber && t.startColumn === position.column - 2;
          let popped = stack.pop();
          if (popped && (popped?.highlight || isCursorInsideToken))
            return [
              toRange(popped, popped.line),
              toRange(
                {
                  startColumn: t.startColumn,
                  endColumn: isSingleDollar ? t.endColumn : t.startColumn + 2,
                },
                l
              ),
            ];
          if (!isSingleDollar) i++;
        } else {
          stack.push(
            isDoubleDollar
              ? { line: l, startColumn: t.startColumn, endColumn: t.startColumn + 2, tag: '$$' }
              : { line: l, ...t }
          );
          if (isDoubleDollar) i++;
        }
      } else if (
        t.tag === '\\(' ||
        t.tag === '\\[' ||
        t.tag === '{' ||
        t.tag.startsWith('\\begin')
      ) {
        stack.push({ line: l, ...t });
      } else if (t.tag === '\\)' || t.tag === '\\]' || t.tag === '}' || t.tag.startsWith('\\end')) {
        let copy = [...stack];
        while (stack.length > 0) {
          let popped = stack.pop();
          if (!popped || matchingBracket(popped.tag) !== t.tag) {
            continue;
          }

          if (popped?.highlight || isCursorInsideToken)
            return [toRange(popped, popped.line), toRange(t, l)];
          copy = stack; // No need to recover stack later
          break;
        }
        stack = copy;
      }

      if (isCursorInsideToken) {
        if (stack.length > 0) {
          stack[stack.length - 1].highlight = true;
          isAfterCursor = true;
        } else {
          return [];
        }
      }
    }
  }

  return [];
}

export function validateModel(model: monaco.editor.ITextModel, owner: string) {
  let stack: (LineStructureToken & { line: number })[] = [];
  let markers: monaco.editor.IMarkerData[] = [];

  let analyserResult = (model as any)._analyserResult as StructureAnalyserResult;
  if (!analyserResult) return;

  let lines = model.getLineCount();
  // In command definitions, allow unmatched \begin, \[, etc.
  let defUntil: monaco.IPosition | undefined = undefined;
  for (let l = 1; l <= lines; l++) {
    let tokens = analyserResult[l];

    for (let i = 0; i < tokens.length; i++) {
      let t = tokens[i];
      let defMode =
        defUntil &&
        (defUntil.lineNumber > l || (defUntil.lineNumber === l && defUntil.column > t.startColumn));

      if (t.tag === '$') {
        let isDoubleDollar =
          tokens[i + 1]?.tag === '$' && tokens[i + 1]?.startColumn === t.endColumn;
        if (
          stack.length > 0 &&
          (stack[stack.length - 1].tag === '$' ||
            (isDoubleDollar && stack[stack.length - 1].tag === '$$'))
        ) {
          if (stack[stack.length - 1].tag !== '$') i++;
          stack.pop();
        } else {
          stack.push(
            isDoubleDollar
              ? { line: l, startColumn: t.startColumn, endColumn: t.startColumn + 2, tag: '$$' }
              : { line: l, ...t }
          );
          if (isDoubleDollar) i++;
        }
      } else if (
        t.tag === '{' ||
        (!defMode && (t.tag === '\\(' || t.tag === '\\[' || t.tag.startsWith('\\begin')))
      ) {
        stack.push({ line: l, ...t });
      } else if (
        t.tag === '}' ||
        (!defMode && (t.tag === '\\)' || t.tag === '\\]' || t.tag.startsWith('\\end')))
      ) {
        let copy = [...stack];
        let newMarkers: monaco.editor.IMarkerData[] = [];
        while (stack.length > 0) {
          let popped = stack.pop();
          if (!popped) continue;
          else if (matchingBracket(popped.tag) !== t.tag) {
            newMarkers.push({
              ...toRange(popped, popped.line),
              severity: monaco.MarkerSeverity.Error,
              message: getString('unmatched-bracket', popped.tag),
            });
            continue;
          }

          copy = stack; // No need to recover stack later
          break;
        }

        if (stack === copy) {
          markers.push(...newMarkers);
        } else {
          markers.push({
            ...toRange(t, l),
            severity: monaco.MarkerSeverity.Error,
            message: getString('unmatched-bracket', t.tag),
          });
          stack = copy;
        }
      } else if (!defMode && (t.tag === 'def' || t.tag === 'newenv' || t.tag === 'envdef')) {
        defUntil = jumpOverGroups(
          model,
          { lineNumber: l, column: t.startColumn },
          t.tag === 'def' ? 1 : t.tag === 'newenv' ? 3 : 4
        );
      }
    }
  }

  for (let token of stack) {
    markers.push({
      ...toRange(token, token.line),
      severity: monaco.MarkerSeverity.Error,
      message: getString('unmatched-bracket', token.tag),
    });
    continue;
  }

  monaco.editor.setModelMarkers(model, owner, markers);
}
