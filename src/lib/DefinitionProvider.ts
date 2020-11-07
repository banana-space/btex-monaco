import * as monaco from 'monaco-editor';
import { options } from './common';
import { imports } from './data';

export const btexDefinitionProvider: monaco.languages.DefinitionProvider = {
  provideDefinition: function (model, position) {
    let line = model
      .getValueInRange({
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: 1,
        endColumn: position.column,
      })
      .replace(/\\\\/g, '  ')
      .replace(/(^|[^\\])%.*/, '$1');
    let fullLine = model.getLineContent(position.lineNumber);

    let match = line.match(/\\([a-zA-Z]+|.?)$/);
    if (match) {
      let sub = fullLine.substring(match.index as number);

      let command = (sub.match(/^\\([a-zA-Z]+|.?)/) as RegExpMatchArray)[0];
      if (/^\\([aegpt]?def|[apt]?let|(re)?newcommand|)$/.test(command)) return [];

      let definition = findCommandDefinition(model, command);

      // Check other files as well
      for (let item of imports) {
        let model = monaco.editor.getModel(item.uri);
        if (!model) continue;

        definition.push(...findCommandDefinition(model, command));
      }

      return definition.length === 0 ? null : definition;
    }
  },
};

// Override 'go to definition' and 'open definition to the side' behaviours
// when definition is not in the current model.
// https://github.com/microsoft/monaco-editor/issues/2000
export function overrideGoToDefinition(editor: monaco.editor.IStandaloneCodeEditor) {
  const editorService = (editor as any)._codeEditorService;
  const openEditorBase = editorService.openCodeEditor.bind(editorService);
  editorService.openCodeEditor = async (
    input: any,
    source: monaco.editor.IStandaloneCodeEditor
  ) => {
    const result = await openEditorBase(input, source);
    if (result === null) {
      source.trigger(null, 'editor.action.peekDefinition', undefined);
    }
    return result; // always return the base result
  };
}

function findCommandDefinition(
  model: monaco.editor.ITextModel,
  command: string
): monaco.languages.Location[] {
  if (command.startsWith('\\')) command = command.substring(1);

  let definitionRegex = new RegExp(
    '(\\\\@?([aegpt@]?def|[apt@]?let|(re)?newcommand\\s*\\*?\\s*\\{?)\\s*)\\\\' +
      (/^[a-zA-Z]+/.test(command) ? `${command}(?![a-zA-Z])` : `\\${command}`)
  );

  let lines = model.getLinesContent();
  let locations: monaco.languages.Location[] = [];

  for (let l = 0; l < lines.length; l++) {
    let line = lines[l];
    if (line.length > options.maxParsedLineLength) continue;

    line = line.replace(/\\\\/g, '  ').replace(/(^|[^\\])%.*/, '$1');
    let match = line.match(definitionRegex);
    if (!match) continue;

    locations.push({
      range: {
        startLineNumber: l + 1,
        endLineNumber: l + 1,
        startColumn: 1 + (match.index as number) + match[1].length,
        endColumn: 1 + (match.index as number) + match[0].length,
      },
      uri: model.uri,
    });
  }

  return locations;
}
