import * as monaco from 'monaco-editor';

export const options = {
  suggestionsLimit: 10000,
  maxParsedLineLength: 10000,
  locale: 'en',
};

export function setVariable(
  editor: monaco.editor.IStandaloneCodeEditor,
  name: string,
  value?: string
) {
  let _editor = editor as any;
  if (!_editor['_variables']) _editor['_variables'] = {};
  _editor['_variables'][name] = value;
}

export function getVariable(
  editor: monaco.editor.IStandaloneCodeEditor,
  name: string
): string | undefined {
  let _editor = editor as any;
  if (!_editor['_variables']) return undefined;
  return _editor['_variables'][name];
}

export function insertText(
  editor: monaco.editor.IStandaloneCodeEditor,
  position: monaco.IPosition,
  text: string,
  cursorPosition?: monaco.IPosition,
  deleteCount?: number
) {
  cursorPosition ??= position;
  editor.executeEdits(
    null,
    [
      {
        range: {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: position.column,
          endColumn: position.column + (deleteCount ?? 0),
        },
        text,
      },
    ],
    [
      new monaco.Selection(
        cursorPosition.lineNumber,
        cursorPosition.column,
        cursorPosition.lineNumber,
        cursorPosition.column
      ),
    ]
  );
}

// Returns the position right after '{' in '\begin{xxx}' or '\end{xxx}'
export function matchEnvironment(
  model: monaco.editor.ITextModel,
  name: string | null,
  start: monaco.IPosition,
  direction: number
): monaco.IPosition | undefined {
  if (direction !== 1 && direction !== -1) return;

  let stack = [name];
  let lineUntilStart = model.getValueInRange({
    startLineNumber: start.lineNumber,
    endLineNumber: start.lineNumber,
    startColumn: 1,
    endColumn: start.column,
  });
  let line = model.getLineContent(start.lineNumber);
  if (direction === 1) {
    line = line.substring(lineUntilStart.length);
  } else {
    // Remove the \end command next to the cursor
    line = lineUntilStart.replace(/\\end(?!.*\\).*/, '');
  }

  let lineCount = model.getLineCount();
  for (let l = start.lineNumber; l > 0 && l <= lineCount; l += direction) {
    if (l !== start.lineNumber) line = model.getLineContent(l);

    if (line.length > options.maxParsedLineLength) return;

    let matches: RegExpMatchArray[] = [];
    while (true) {
      let match = line.match(/\\(begin|end)(\s*)\{([^\{\}\\]*)\}/);
      if (!match) break;

      matches.push(match);
      line = line.substring((match.index as number) + 1);
    }

    for (
      let i = direction === 1 ? 0 : matches.length - 1;
      i >= 0 && i < matches.length;
      i += direction
    ) {
      if ((matches[i][1] === 'begin') === (direction === 1)) stack.push(matches[i][3]);
      else {
        let name = stack.pop();
        if (name !== null && name !== matches[i][3]) return;
        if (stack.length === 0)
          return model.getPositionAt(
            model.getOffsetAt({
              lineNumber: l,
              column: l === start.lineNumber && direction === 1 ? start.column : 1,
            }) +
              (matches[i].index as number) +
              matches[i][2].length +
              (6 - direction)
          );
      }
    }
  }
}
