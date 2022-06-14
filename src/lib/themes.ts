import * as monaco from 'monaco-editor';

export const btexLightTheme: monaco.editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: false,
  rules: [
    { token: 'keyword', foreground: 'f87000' },
    { token: 'command', foreground: 'f87000' },
    { token: 'attribute.value', foreground: 'f87000' },
    { token: 'tag', foreground: 'f8a000' },
    { token: 'command.math', foreground: 'f8a000' },
    { token: 'delimiter', foreground: '40484c' },
    { token: 'delimiter.command', foreground: 'f87000' },
    { token: 'delimiter.css', foreground: '687074' },
    { token: 'delimiter.html', foreground: 'a0a8b0' },
    { token: 'attribute.name', foreground: '30a0e0' },
    { token: 'argument', foreground: '30a0e0' },
    { token: 'string', foreground: '70a000' },
    { token: 'identifier', foreground: '40484c' },
    { token: 'text', foreground: '40484c' },
    { token: 'text.math', foreground: '687074' },
    { token: 'text.special', foreground: 'f87000' },
    { token: 'text.link', foreground: '9068d8' },
    { token: 'comment', foreground: 'a0a0a0' },
  ],
  colors: {
    'editorLineNumber.foreground': '#c4d0d4',
    'editorLineNumber.activeForeground': '#78848c',
    'editor.lineHighlightBackground': '#8098a018',
    'editor.lineHighlightBorder': 'transparent',
    'editor.selectionBackground': '#0090d028',
    'minimap.selectionHighlight': '#0090d050',
    'menu.selectionBackground': '#0090d028',
    'menu.selectionForeground': '#404040',
  },
};
