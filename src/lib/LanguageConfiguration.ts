import * as monaco from 'monaco-editor';

export const btexLanguageConfiguration: monaco.languages.LanguageConfiguration = {
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '\\\\{', close: '}' },
    { open: '\\\\[', close: ']' },
    { open: '\\\\(', close: ')' },
    { open: '\\{', close: '\\}' },
    { open: '\\[', close: '\\]' },
    { open: '\\(', close: '\\)' },
    { open: '`', close: "'" },
    { open: '$', close: '$', notIn: ['comment'] },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '`', close: "'" },
    { open: '$', close: '$' },
  ],
  brackets: [],
  comments: { lineComment: '%' },
  indentationRules: {
    increaseIndentPattern: /\\begin\s*\{[^\{\}\\]*\}(?!.*\\(begin|end)\s*\{)/,
    decreaseIndentPattern: /^\s*\\end\s*\{/,
  },
  wordPattern: /\\(@*[a-zA-Z]*)|[^\s\d`~!@#$%^&*()\-=_+[\]{}\\\|;:'"<>,./?\u0500-\uffff]+/g,
  onEnterRules: [
    {
      beforeText: /\\begin\s*\{[^\{\}\\]*\}(?!.*\\(begin|end)\s*\{)/,
      afterText: /^\s*\\end\s*\{/,
      action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
    },
    {
      beforeText: /\\begin\s*\{[^\{\}\\]*\}(?!.*\\(begin|end)\s*\{)/,
      action: { indentAction: monaco.languages.IndentAction.Indent },
    },
    {
      beforeText: /\$\$\s*$/,
      afterText: /^\s*\$\$/,
      action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
    },
    {
      beforeText: /\\\[\s*$/,
      afterText: /^\s*\\\]/,
      action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
    },
    {
      beforeText: /\\\(\s*$/,
      afterText: /^\s*\\\)/,
      action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
    },
    {
      beforeText: /\{\s*$/,
      afterText: /^\s*\}/,
      action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
    },
  ],
};
