import * as monaco from 'monaco-editor';
import { getVariable, insertText, options, setVariable } from './common';
import { matchEnvironment } from './structure';
import { btexStructureAnalyser, StructureAnalyserResult } from './StructureAnalyser';

export function onDidChangeModelContent(
  editor: monaco.editor.IStandaloneCodeEditor,
  e: monaco.editor.IModelContentChangedEvent
) {
  // Auto removing of spaces in empty lines are merged with ordinary edits,
  // but we do not want them
  let changes = e.changes;
  if (changes.length > 1) {
    let oldValue = getVariable(editor, 'old_value') ?? '';
    var prevModel = monaco.editor.createModel(oldValue, 'btex');
    changes = changes.filter(
      (change) =>
        !(
          change.text === '' &&
          change.range.startLineNumber === change.range.endLineNumber &&
          change.range.startColumn === 1 &&
          change.range.endColumn === prevModel.getLineLength(change.range.startLineNumber) + 1 &&
          /^\s+$/.test(prevModel.getLineContent(change.range.startLineNumber))
        )
    );
  }

  // TODO: auto remove trailing spaces
  setTimeout(() => {
    let model = editor.getModel();
    let position = editor.getPosition();
    if (!model || !position) return;

    let oldValue = getVariable(editor, 'old_value') ?? '';
    setVariable(editor, 'old_value', editor.getValue());

    // Analyse document structure, and store it in the model
    let analyseAll = false;
    for (let change of changes) {
      if (
        change.range.startLineNumber !== change.range.endLineNumber ||
        change.text.includes('\n')
      ) {
        analyseAll = true;
        break;
      }
    }

    let analyserResult = ((model as any)._analyserResult ?? {}) as StructureAnalyserResult;
    if (analyseAll) {
      analyserResult = btexStructureAnalyser.analyse(model);
    } else {
      for (let change of changes)
        Object.assign(analyserResult, btexStructureAnalyser.analyse(model, change.range));
    }

    (model as any)._analyserResult = analyserResult;

    // Editing actions
    if (e.isUndoing || e.isRedoing || changes.length !== 1) return;

    let line = model.getValueInRange({
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: 1,
      endColumn: position.column,
    });
    let fullLine = model.getLineContent(position.lineNumber);
    if (fullLine.length > options.maxParsedLineLength) return;

    let newText = changes[0].text;

    let begin_line = getVariable(editor, 'begin_line');

    // Complete $$$$
    if (newText === '$' && line.endsWith('$$')) {
      insertText(editor, position, `$$`);
    }

    // Trigger \begin{...} completion
    if ('\\begin{'.endsWith(newText) && line.endsWith('{') && newText !== '') {
      editor.trigger(null, 'editor.action.triggerSuggest', undefined);
      setVariable(editor, 'begin_line', position.lineNumber.toString());
      return;
    }

    // Non-auto-completed \begin
    let match = line.match(/\\begin\s*\{([^\{\}\\\s]*)\}$/);
    if (match && newText === '}' && begin_line === position.lineNumber.toString()) {
      insertText(editor, position, `\\end{${match[1]}}`);
    }

    // Sync \begin{} with \end{}
    match = line.match(/\\(begin|end)\s*\{([^\{\}\\]*)(\}?)$/);
    let isCompletion = match && match[3] && newText === match[2] + '}';
    if (
      match &&
      (isCompletion || !match[3]) &&
      (isCompletion || newText.length <= match[2].length) &&
      changes[0].range.endLineNumber === position.lineNumber &&
      changes[0].range.startColumn === position.column - changes[0].text.length
    ) {
      if (!isCompletion) {
        setTimeout(() => {
          editor.trigger(null, 'editor.action.triggerSuggest', undefined);
        }, 0);
      }

      let oldModel = prevModel ?? monaco.editor.createModel(oldValue, 'btex');
      let oldLine = oldModel.getLineContent(position.lineNumber);
      let oldEnvNameMatch = oldLine
        .substring(match.index as number)
        .match(/\\(begin|end)\s*\{([^\{\}\\]*)\}/);
      let newEnvNameMatch = fullLine
        .substring(match.index as number)
        .match(/\\(begin|end)\s*\{([^\{\}\\]*)\}/);
      if (oldEnvNameMatch && newEnvNameMatch) {
        let oldEnvName = oldEnvNameMatch[2];
        let newEnvName = newEnvNameMatch[2];
        let direction = newEnvNameMatch[1] === 'begin' ? 1 : -1;
        let otherPosition = matchEnvironment(model, oldEnvName, position, direction);

        let cursorPosition = { ...position };
        if (otherPosition?.lineNumber === position.lineNumber && direction === -1)
          cursorPosition.column += newEnvName.length - oldEnvName.length;

        if (otherPosition && /^[^\ud800-\udfff]*$/.test(oldEnvName)) {
          insertText(editor, otherPosition, newEnvName, cursorPosition, oldEnvName.length);
        }
      }
    }

    if (begin_line && begin_line !== position.lineNumber.toString())
      setVariable(editor, 'begin_line');
  }, 0);
}
