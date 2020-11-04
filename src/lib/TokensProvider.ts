import * as monaco from 'monaco-editor';
import { envCommands, envStarCommands, mathEnvs } from './data';

export const btexTokensProvider: monaco.languages.IMonarchLanguage = {
  envCommands,
  envStarCommands,
  mathEnvs: mathEnvs.map((name) => '{' + name + '}'),
  defaultToken: 'text',
  tokenizer: {
    root: [
      { include: '@common' },
      [/\\begin(?=\s*\{)/, 'command', '@begin'],
      [
        /(\\[a-zA-Z]+)(\*)/,
        {
          cases: {
            '@envStarCommands': ['command', { token: 'text', next: '@env' }],
            '@default': ['command', 'text'],
          },
        },
      ],
      [
        /\\(@*[a-zA-Z]+|@+|.?)/,
        {
          cases: {
            '@envCommands': { token: 'command', next: '@env' },
            '@default': 'command',
          },
        },
      ],
      [/./, 'text'],
    ],

    math: [
      [/[\^_]/, 'text.special'],
      [/\\begin(?=\s*\{)/, 'command', '@begin'],
      [/\\[\\]/, 'command'],
      [
        /(\\[a-zA-Z]+)(\*)/,
        {
          cases: {
            '@envStarCommands': ['command', { token: 'text', next: '@env' }],
            '@default': ['command.math', 'text'],
          },
        },
      ],
      [
        /\\(@*[a-zA-Z]+|@+|.?)/,
        {
          cases: {
            '@envCommands': { token: 'command', next: '@env' },
            '@default': 'command.math',
          },
        },
      ],
      { include: '@common' },
      [/./, 'text.math'],
    ],

    common: [
      [/[\{\}]/, 'delimiter.curly'],
      [/[\(\)\[\]]/, 'delimiter'],
      [/\$\$/, 'delimiter.command', '@math.double'],
      [/\$/, 'delimiter.command', '@math.single'],
      [/\\\[/, 'delimiter.command', '@math.['],
      [/\\\(/, 'delimiter.command', '@math.('],
      [/[&~]/, 'text.special'],
      [/#+[+-]?([a-zA-Z]+|.?)/, 'argument'],
      [/%/, '@rematch', '@comment'],
    ],

    comment: [[/.*/, 'comment', '@pop']],

    begin: [
      [
        /(\{)([^\{\}\\]*)(\})/,
        {
          cases: {
            '@mathEnvs': [
              'delimiter.curly',
              'string.env',
              { token: 'delimiter.curly', next: '@math.env' },
            ],
            '@default': [
              'delimiter.curly',
              'string.env',
              { token: 'delimiter.curly', next: '@pop' },
            ],
          },
        },
      ],
      [/\s/, ''],
      [/./, '@rematch', '@pop'],
    ],

    end: [
      [
        /(\{)([^\{\}\\]*)(\})/,
        {
          cases: {
            '@mathEnvs': [
              'delimiter.curly',
              'string.env',
              { token: 'delimiter.curly', next: '@root' },
            ],
            '@default': [
              'delimiter.curly',
              'string.env',
              { token: 'delimiter.curly', next: '@pop' },
            ],
          },
        },
      ],
      [/\s/, ''],
      [/./, '@rematch', '@pop'],
    ],

    env: [
      [
        /(\{)([^\{\}\\]*)(\})/,
        ['delimiter.curly', 'string.env', { token: 'delimiter.curly', next: '@pop' }],
      ],
      [/\s/, ''],
      [/./, '@rematch', '@pop'],
    ],

    'math.env': [[/\\end(?=\s*\{)/, 'delimiter.command', '@end'], { include: '@math' }],
    'math.double': [[/\$\$/, 'delimiter.command', '@root'], { include: '@math' }],
    'math.single': [[/\$/, 'delimiter.command', '@pop'], { include: '@math' }],
    'math.[': [[/\\\]/, 'delimiter.command', '@root'], { include: '@math' }],
    'math.(': [[/\\\)/, 'delimiter.command', '@pop'], { include: '@math' }],
  },

  brackets: [{ open: '{', close: '}', token: 'delimiter.curly' }],
} as monaco.languages.IMonarchLanguage;
