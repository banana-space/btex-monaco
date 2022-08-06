import * as monaco from 'monaco-editor';
import { diffLines } from 'diff';
import { insertText, options } from './common';
import { getHighlightBrackets, matchEnvironment, validateModel } from './structure';
import { btexStructureAnalyser, StructureAnalyserResult } from './StructureAnalyser';

export function onDidChangeModelContent(
  editor: monaco.editor.IStandaloneCodeEditor,
  e: monaco.editor.IModelContentChangedEvent
) {
  // Auto removing of spaces in empty lines are merged with ordinary edits,
  // but we do not want them
  let changes = e.changes;
  if (changes.length > 1) {
    let oldValue = ((editor as any)._oldValue as string) ?? '';
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

  let validateTimeout = (editor as any)._validateTimeout as number;
  if (validateTimeout !== undefined) clearTimeout(validateTimeout);
  (editor as any)._validateTimeout = setTimeout(() => {
    let model = editor.getModel();
    if (model) validateModel(model, editor.getId());
    delete (editor as any)._validateTimeout;
  }, 500);

  // TODO: auto remove trailing spaces
  setTimeout(() => {
    let model = editor.getModel();
    let position = editor.getPosition();
    if (!model || !position) return;

    let oldValue = ((editor as any)._oldValue as string) ?? '';
    (editor as any)._oldValue = editor.getValue();

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

    // Diff
    let diffSource = (editor as any)._diffSource;
    if (diffSource !== undefined) {
      let changes = diffLines(diffSource, model.getValue());

      let decorations: monaco.editor.IModelDeltaDecoration[] = [];
      let line = 1;
      let changedAmount = 0;
      for (let i = 0; i < changes.length; i++) {
        let change = changes[i];
        if (change.added) {
          decorations.push({
            range: new monaco.Range(line, 1, line + (change.count ?? 1) - 1, 1),
            options: {
              isWholeLine: true,
              linesDecorationsClassName: 'line-dec-added',
              minimap: {
                color: '#81b88b',
                position: monaco.editor.MinimapPosition.Gutter,
              },
            },
          });
          line += change.count ?? 1;
          changedAmount += change.count ?? 1;
        } else if (change.removed) {
          let startLine = line;
          changedAmount += change.count ?? 1;
          if (i + 1 < changes.length && changes[i + 1].added) {
            line += changes[i + 1].count ?? 1;
            changedAmount += changes[i + 1].count ?? 1;
            i++;
          }

          decorations.push({
            range: new monaco.Range(startLine, 1, startLine === line ? line : line - 1, 1),
            options: {
              isWholeLine: true,
              linesDecorationsClassName:
                startLine === line ? 'line-dec-removed' : 'line-dec-modified',
              minimap: {
                color: startLine === line ? '#ca4b51' : '#66afe0',
                position: monaco.editor.MinimapPosition.Gutter,
              },
            },
          });
        } else {
          line += change.count ?? 1;
        }
      }

      if (changedAmount > 200) {
        // Disable diff -- large diffs are super slow.
        decorations = [];
        delete (editor as any)._diffSource;
      }

      let oldDecorations = ((model as any)._diffDecorations as string[]) ?? [];
      let newDecorations = editor.deltaDecorations(oldDecorations, decorations);
      (model as any)._diffDecorations = newDecorations;
    }

    // Exit if is undo/redo
    if (e.isUndoing || e.isRedoing || changes.length !== 1) return;

    // Editing actions
    let line = model.getValueInRange({
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: 1,
      endColumn: position.column,
    });
    let fullLine = model.getLineContent(position.lineNumber);
    if (fullLine.length > options.maxParsedLineLength) return;

    let newText = changes[0].text;

    // Complete $$$$
    if (newText === '$' && line.endsWith('$$')) {
      insertText(editor, position, `$$`);
    }

    // Trigger \begin{...} completion
    if ('\\begin{'.endsWith(newText) && /\\begin\s*\{$/.test(line) && newText !== '') {
      editor.trigger(null, 'editor.action.triggerSuggest', undefined);
      return;
    }

    // Suppress completion on \\
    if (/\\\\$/.test(line)) {
      let selections = editor.getSelections();
      if (selections) {
        editor.setSelections([
          {
            selectionStartLineNumber: 1,
            selectionStartColumn: 1,
            positionColumn: 1,
            positionLineNumber: 1,
          },
        ]);
        editor.setSelections(selections);
      }
    }

    // Non-auto-completed \begin
    let match = line.match(/\\begin\s*\{([^\{\}\\\s]*)\}$/);
    if (
      match &&
      newText === '}' &&
      !fullLine.substr(line.length).trim().startsWith(`\\end{${match[1]}}`)
    ) {
      insertText(editor, position, `\\end{${match[1]}}`);
    }

    match = line.match(/\\begin\s*\{$/);
    if (match && newText === '{}') {
      insertText(editor, position, '}\\end{}', position, 1);
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

    onDidChangeCursorPosition(editor);
  }, 0);
}

export function onDidChangeCursorPosition(
  editor: monaco.editor.IStandaloneCodeEditor,
  e?: monaco.editor.ICursorPositionChangedEvent
) {
  if (e && e.reason !== monaco.editor.CursorChangeReason.Explicit) {
    // Cursor change caused by content change,
    // handle the content change event instead.
    return;
  }

  setTimeout(() => {
    let model = editor.getModel();
    let position = editor.getPosition();
    if (!model || !position) return;

    let oldDecorations = ((model as any)._bracketsDecorations as string[]) ?? [];

    let brackets = getHighlightBrackets(model, position);
    let newDecorations = model.deltaDecorations(
      oldDecorations,
      brackets.map((range) => ({
        options: {
          className: 'bracket-match',
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
        range,
      }))
    );
    (model as any)._bracketsDecorations = newDecorations;
  }, 0);
}
