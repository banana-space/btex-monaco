import * as monaco from 'monaco-editor';
import { options } from './common';
import {
  commandDictionary,
  envCommands,
  environmentDictionary,
  envStarCommands,
  snippetDictionary,
} from './data';
import { detectMode, matchEnvironment } from './structure';

export const btexCompletionItemProvider: monaco.languages.CompletionItemProvider = {
  triggerCharacters: ['\\'],

  provideCompletionItems: function (model, position) {
    let suggestions: monaco.languages.CompletionItem[] = [];

    let word = model.getWordUntilPosition(position).word;
    let fullWord = model.getWordAtPosition(position)?.word;
    let line = model.getValueInRange({
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: 1,
      endColumn: position.column,
    });
    let lineAfter = model.getLineContent(position.lineNumber).substring(line.length);

    let matchBefore = line.match(/\\(?:begin|end)\s*\{([^\{\}\\\ud800-\udfff]*)$/);
    if (matchBefore) {
      // Environment completion
      let matchAfter = lineAfter.match(/([^\{\}\\\ud800-\udfff]*)\}/);
      let addEndEnv = !matchAfter;

      let range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: position.column - matchBefore[1].length,
        endColumn: position.column + (matchAfter ? matchAfter[1].length + 1 : 0),
      };

      let mode = detectMode(model, position);
      for (let name in environmentDictionary) {
        let env = environmentDictionary[name];
        if (mode === 'T' && env.mode === 'M') continue;
        suggestions.push({
          kind: env.kind ?? monaco.languages.CompletionItemKind.Module,
          label: name,
          insertText: addEndEnv ? name + '}${0}\\end{' + name + '}' : name + '}',
          insertTextRules:
            env.insertTextRules ?? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          detail: `\\begin{${name}}` + (env.signature ?? ''),
          documentation: { value: env.doc[options.locale] },
          tags: env.deprecated ? [monaco.languages.CompletionItemTag.Deprecated] : undefined,
        } as monaco.languages.CompletionItem);
      }

      let codeEnvironments = findAllEnvironments(model, fullWord);
      for (let name of codeEnvironments) {
        suggestions.push({
          kind: monaco.languages.CompletionItemKind.Module,
          label: name,
          insertText: addEndEnv ? name + '}${0}\\end{' + name + '}' : name + '}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          detail: `\\begin{${name}}`,
        } as monaco.languages.CompletionItem);
      }

      return { suggestions }; // suppresses other completions
    }

    if (
      /^\\[a-zA-Z]*$/.test(word) &&
      !/(^|[^\\#]|#\\)(\\\\)+$/.test(line) &&
      !/#\\[a-zA-Z]*$/.test(line)
    ) {
      let mode = detectMode(model, position.delta(0, -word.length));

      // Snippets
      for (let name in snippetDictionary) {
        let snippet = snippetDictionary[name];
        if (mode === 'T' && snippet.mode === 'M') continue;
        suggestions.push({
          kind:
            snippet.kind ??
            (snippet.mode === 'M'
              ? monaco.languages.CompletionItemKind.Field
              : monaco.languages.CompletionItemKind.Method),
          label: name,
          insertText: snippet.insertText ?? name,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: snippet.signature ?? name,
          documentation: { value: snippet.doc[options.locale] },
          tags: snippet.deprecated ? [monaco.languages.CompletionItemTag.Deprecated] : undefined,
        } as monaco.languages.CompletionItem);
      }

      // Command completion
      for (let name in commandDictionary) {
        let command = commandDictionary[name];
        if (mode === 'T' && command.mode === 'M') continue;
        suggestions.push({
          kind:
            command.kind ??
            (command.mode === 'M'
              ? monaco.languages.CompletionItemKind.Field
              : monaco.languages.CompletionItemKind.Method),
          label: name,
          insertText: command.insertText ?? name,
          insertTextRules: command.insertTextRules,
          detail: command.signature ?? name,
          documentation: { value: command.doc[options.locale] },
          tags: command.deprecated ? [monaco.languages.CompletionItemTag.Deprecated] : undefined,
        } as monaco.languages.CompletionItem);
      }

      let codeCommands = findAllCommands(model, fullWord);
      for (let command of codeCommands) {
        suggestions.push({
          kind: monaco.languages.CompletionItemKind.Method,
          label: command,
          insertText: command,
          detail: command,
        } as monaco.languages.CompletionItem);
      }

      // Precise \end{...} item
      let beginPosition = matchEnvironment(model, null, position, -1);
      if (beginPosition) {
        let text = model.getValueInRange({
          startLineNumber: beginPosition.lineNumber,
          endLineNumber: beginPosition.lineNumber,
          startColumn: beginPosition.column,
          endColumn: model.getLineLength(beginPosition.lineNumber) + 1,
        });
        let match = text.match(/^[^\{\}\\]*(?=\})/);
        if (match) {
          suggestions = suggestions.filter((item) => item.label !== '\\end');
          suggestions.push({
            kind: monaco.languages.CompletionItemKind.Method,
            label: `\\end{${match[0]}}`,
            insertText: `\\end{${match[0]}}`,
            detail: `\\end{${match[0]}}`,
            documentation: {
              value: commandDictionary['\\end'].doc[options.locale].replace(
                /#environment/g,
                match[0]
              ),
            },
          } as monaco.languages.CompletionItem);
        }
      }
    }

    return { suggestions };
  },
};

function findAllCommands(model: monaco.editor.ITextModel, ignoreOnce?: string): Iterable<string> {
  const regex = /\\([a-zA-Z]+)/g;
  let seen = new Set<string>();

  let lines = model.getLinesContent();

  // TODO: make this better
  let preambleModel = monaco.editor.getModel(monaco.Uri.file('/preamble'));
  if (preambleModel) lines.push(...preambleModel.getLinesContent());

  for (let line of lines) {
    if (line.length > options.maxParsedLineLength) continue;
    let match = line.match(regex);
    if (!match) continue;

    for (let word of match) {
      if (word === ignoreOnce) {
        ignoreOnce = undefined;
      } else {
        if (!(word in commandDictionary) && !seen.has(word)) seen.add(word);
        if (seen.size > options.suggestionsLimit) return seen;
      }
    }
  }
  return seen;
}

function findAllEnvironments(
  model: monaco.editor.ITextModel,
  ignoreTwice?: string
): Iterable<string> {
  const regex = new RegExp(
    '(?:' +
      [...envCommands, ...envStarCommands].join('|').replace(/\\/g, '\\\\').replace(/\*/g, '\\*') +
      ')\\s*\\{([a-zA-Z\\*]+)\\}',
    'g'
  );
  let seen = new Set<string>();
  let ignoredOnce = false;

  let lines = model.getLinesContent();

  // TODO: make this better
  let preambleModel = monaco.editor.getModel(monaco.Uri.file('/preamble'));
  if (preambleModel) lines.push(...preambleModel.getLinesContent());

  for (let line of lines) {
    if (line.length > options.maxParsedLineLength) continue;
    let match = line.match(regex);
    if (!match) continue;

    for (let word of match) {
      let shorterMatch = word.match(/\{([a-zA-Z\*]+)\}/);
      if (!shorterMatch) continue;

      word = shorterMatch[1];
      if (word === ignoreTwice) {
        if (ignoredOnce) ignoreTwice = undefined;
        else ignoredOnce = true;
      } else {
        if (!(word in environmentDictionary) && !seen.has(word)) seen.add(word);
        if (seen.size > options.suggestionsLimit) return seen;
      }
    }
  }
  return seen;
}
