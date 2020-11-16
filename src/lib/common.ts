import * as monaco from 'monaco-editor';

export const options = {
  suggestionsLimit: 10000,
  maxParsedLineLength: 10000,
  locale: 'en',
};

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
