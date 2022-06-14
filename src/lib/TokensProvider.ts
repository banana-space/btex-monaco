import * as monaco from 'monaco-editor';
import { envCommands, envStarCommands, mathEnvironments } from './data';

export const btexTokensProvider: monaco.languages.IMonarchLanguage = {
  envCommands,
  envStarCommands,
  mathEnvironments: mathEnvironments.map((name) => '{' + name + '}'),
  defaultToken: 'text',
  includeLF: true,
  tokenizer: {
    root: [
      [/\[\[/, 'delimiter', '@inlink'],
      { include: '@common' },
      [/\\begin(?=\s*\{)/, 'command', '@begin'],
      [/\\@?[aegpt@]?def(?![a-zA-Z])/, { token: 'command', next: '@def.1' }],
      [
        /(\\@?(?:re)?newcommand)(\s*)(\**)(\s*)(\{)(\s*)(\\(?:[a-zA-Z]+|.))(\s*)(\})/,
        [
          'command',
          '',
          'text',
          '',
          'delimiter.curly',
          '',
          'command',
          '',
          { token: 'delimiter.curly', next: '@def.1' },
        ],
      ],
      [
        /(\\@?(?:re)?newcommand)(\s*)(\**)(\s*)(\\(?:[a-zA-Z]+|.))/,
        ['command', '', 'text', '', { token: 'command', next: '@def.1' }],
      ],
      [
        /(\\@?(?:re)?newenvironment)(\s*)(\**)(\s*)(\{)([^\{\}\\]*)(\})/,
        [
          'command',
          '',
          'text',
          '',
          'delimiter.curly',
          'string.env',
          { token: 'delimiter.curly', next: '@def.2' },
        ],
      ],
      [
        /(\\@?env[ap]?def)(\s*)(\**)(\s*)(\{)([^\{\}\\]*)(\})/,
        [
          'command',
          '',
          'text',
          '',
          'delimiter.curly',
          'string.env',
          { token: 'delimiter.curly', next: '@def.3' },
        ],
      ],
      [
        /(\\@?(?:re)?newenvironment)(\s*)(\**)(\s*)(\{)/,
        ['command', '', 'text', '', { token: '@rematch', next: '@def.3' }],
      ],
      [
        /(\\@?env[ap]?def)(\s*)(\**)(\s*)(\{)/,
        ['command', '', 'text', '', { token: '@rematch', next: '@def.4' }],
      ],
      [/(\\(?:href|url))(\s*)(\{)/, ['command', '', { token: 'delimiter.curly', next: '@inurl' }]],
      { include: '@commands' },
      [/^(\s*)(\*)([\s\n])/, ['', 'text.special', '']],
      [
        /^(\s*)(==)((?!=).*[^=]==\s*\n)/,
        ['', 'text.special', { token: '@rematch', next: '@intitle' }],
      ],
      [
        /^(\s*)(===)((?!=).*[^=]===\s*\n)/,
        ['', 'text.special', { token: '@rematch', next: '@intitle' }],
      ],
      [
        /^(\s*)(====)((?!=).*[^=]====\s*\n)/,
        ['', 'text.special', { token: '@rematch', next: '@intitle' }],
      ],
      [/./, 'text'],
    ],

    math: [
      [/[\^_]/, 'text.special'],
      [/\\begin(?=\s*\{)/, 'command', '@begin'],
      [/\\[\\]/, 'command'],
      [/\{/, 'delimiter.curly', 'math.group'],
      { include: '@commands.math' },
      { include: '@common' },
      [/./, 'text.math'],
    ],

    intitle: [
      [/\n/, '', '@popall'],
      [/(==+)(\s*\n)/, ['text.special', { token: '', next: '@pop' }]],
      { include: '@root' },
    ],

    inlink: [
      [/\n/, '', '@popall'],
      [/\||\]\]/, 'delimiter', '@pop'],
      [/\{/, 'delimiter.curly', 'inlink.group'],
      { include: '@common' },
      { include: '@commands' },
      [/./, 'text.link'],
    ],

    inurl: [
      [/\n/, '', '@popall'],
      [/\}/, 'delimiter.curly', '@pop'],
      [/\{/, 'delimiter.curly', '@push'],
      { include: '@common' },
      { include: '@commands' },
      [/./, 'text.link'],
    ],

    common: [
      [/[\{\}]/, 'delimiter.curly'],
      [/[\(\)\[\]]/, 'delimiter'],
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
            '@mathEnvironments': [
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
            '@mathEnvironments': [
              'delimiter.curly',
              'string.env',
              { token: 'delimiter.curly', next: '@popall' },
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
    'math.double': [[/\$\$/, 'delimiter.command', '@popall'], { include: '@math' }],
    'math.single': [[/\$/, 'delimiter.command', '@pop'], { include: '@math' }],
    'math.[': [[/\\\]/, 'delimiter.command', '@popall'], { include: '@math' }],
    'math.(': [[/\\\)/, 'delimiter.command', '@pop'], { include: '@math' }],

    'math.group': [
      [/\{/, 'delimiter.curly', '@push'],
      [/\}/, 'delimiter.curly', '@pop'],
      { include: '@math' },
    ],

    'inlink.group': [
      [/\{/, 'delimiter.curly', '@push'],
      [/\}/, 'delimiter.curly', '@pop'],
      { include: '@inlink' },
    ],

    'def.1': [
      [/\{/, 'delimiter.curly', '@def.group.1'],
      { include: '@common' },
      { include: '@commands.nomath' },
    ],

    'def.2': [
      [/\{/, 'delimiter.curly', '@def.group.2'],
      { include: '@common' },
      { include: '@commands.nomath' },
    ],

    'def.3': [
      [/\{/, 'delimiter.curly', '@def.group.3'],
      { include: '@common' },
      { include: '@commands.nomath' },
    ],

    'def.4': [
      [/\{/, 'delimiter.curly', '@def.group.4'],
      { include: '@common' },
      { include: '@commands.nomath' },
    ],

    'def.group.1': [
      [/\{/, 'delimiter.curly', '@def.group'],
      [/\}/, 'delimiter.curly', '@popall'],
      { include: '@common' },
      { include: '@commands.nomath' },
    ],

    'def.group.2': [
      [/\{/, 'delimiter.curly', '@def.group'],
      [
        /(\})(\s*)(\{)/,
        ['delimiter.curly', '', { token: 'delimiter.curly', next: '@def.group.1' }],
      ],
      [/\}/, 'delimiter.curly', '@popall'],
      { include: '@common' },
      { include: '@commands.nomath' },
    ],

    'def.group.3': [
      [/\{/, 'delimiter.curly', '@def.group'],
      [
        /(\})(\s*)(\{)/,
        ['delimiter.curly', '', { token: 'delimiter.curly', next: '@def.group.2' }],
      ],
      [/\}/, 'delimiter.curly', '@popall'],
      { include: '@common' },
      { include: '@commands.nomath' },
    ],

    'def.group.4': [
      [/\{/, 'delimiter.curly', '@def.group'],
      [
        /(\})(\s*)(\{)/,
        ['delimiter.curly', '', { token: 'delimiter.curly', next: '@def.group.3' }],
      ],
      [/\}/, 'delimiter.curly', '@popall'],
      { include: '@common' },
      { include: '@commands.nomath' },
    ],

    'def.group': [
      [/\{/, 'delimiter.curly', '@push'],
      [/\}/, 'delimiter.curly', '@pop'],
      { include: '@common' },
      { include: '@commands.nomath' },
    ],

    commands: [
      [/\$\$/, 'delimiter.command', '@math.double'],
      [/\$/, 'delimiter.command', '@math.single'],
      [/\\\[/, 'delimiter.command', '@math.['],
      [/\\\(/, 'delimiter.command', '@math.('],
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
    ],

    'commands.math': [
      [/\$\$/, 'delimiter.command', '@math.double'],
      [/\$/, 'delimiter.command', '@math.single'],
      [/\\\[/, 'delimiter.command', '@math.['],
      [/\\\(/, 'delimiter.command', '@math.('],
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
    ],

    'commands.nomath': [
      [/\$/, 'delimiter.command'],
      [/\\\[/, 'delimiter.command'],
      [/\\\(/, 'delimiter.command'],
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
    ],
  },

  brackets: [{ open: '{', close: '}', token: 'delimiter.curly' }],
} as monaco.languages.IMonarchLanguage;
