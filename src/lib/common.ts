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
