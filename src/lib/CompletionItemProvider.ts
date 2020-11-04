import * as monaco from 'monaco-editor';
import { matchEnvironment, options } from './common';
import {
  commandDictionary,
  envCommands,
  environmentDictionary,
  envStarCommands,
  snippetDictionary,
} from './data';

export const btexCompletionItemProvider: monaco.languages.CompletionItemProvider = {
  triggerCharacters: ['\\'],

  // TODO: suggest based on the current mode (text or math)
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

      for (let name in environmentDictionary) {
        let env = environmentDictionary[name];
        suggestions.push({
          kind: env.kind ?? monaco.languages.CompletionItemKind.Module,
          label: name,
          insertText: addEndEnv ? name + '}${0}\\end{' + name + '}' : name + '}',
          insertTextRules:
            env.insertTextRules ?? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          detail: `\\begin{${name}}` + (env.signature ?? ''),
          documentation: { value: env.doc[options.locale] },
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

    if (/^\\[a-zA-Z]*$/.test(word) && !/(^|[^\\])(\\\\)+$/.test(line)) {
      // Snippets
      for (let name in snippetDictionary) {
        let snippet = snippetDictionary[name];
        suggestions.push({
          kind: snippet.kind ?? monaco.languages.CompletionItemKind.Snippet,
          label: name,
          insertText: snippet.insertText ?? name,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: name + (snippet.signature ?? ''),
          documentation: { value: snippet.doc[options.locale] },
        } as monaco.languages.CompletionItem);
      }

      // Command completion
      for (let name in commandDictionary) {
        let command = commandDictionary[name];
        suggestions.push({
          kind: command.kind ?? monaco.languages.CompletionItemKind.Method,
          label: name,
          insertText: command.insertText ?? name,
          insertTextRules: command.insertTextRules,
          detail: name + (command.signature ?? ''),
          documentation: { value: command.doc[options.locale] },
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

  for (let line of model.getLinesContent()) {
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

  for (let line of model.getLinesContent()) {
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
