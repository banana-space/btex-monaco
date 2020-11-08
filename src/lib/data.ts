import * as monaco from 'monaco-editor';

export const envCommands = [
  '\\begin',
  '\\end',
  '\\envdef',
  '\\newenvironment',
  '\\newtheorem',
  '\\renewenvironment',
];

export const envStarCommands = ['\\newenvironment*', '\\renewenvironment*', '\\newtheorem*'];

export const mathEnvironments = [
  'align',
  'align*',
  'equation',
  'equation*',
  'multline',
  'multline*',
];

export interface CompletionItem {
  mode: 'M' | 'T' | 'MT';
  kind?: monaco.languages.CompletionItemKind;
  insertText?: string;
  insertTextRules?: monaco.languages.CompletionItemInsertTextRule;
  signature?: string;
  doc: { [lang: string]: string };
  deprecated?: boolean;
}

export const commandDictionary: { [key: string]: CompletionItem } = {
  '\\AA': {
    mode: 'T',
    doc: { en: 'Å', zh: '字符 Å (U+00C5)。' },
  },
  '\\addtocounter': {
    mode: 'MT',
    signature: '\\addtocounter{#counter}{#value}',
    doc: { en: '', zh: '使计数器 `#counter` 的值增加 `#value`。' },
  },
  '\\adef': {
    mode: 'MT',
    signature: '\\adef <command> <arguments> {#definition}',
    doc: { en: '', zh: '给命令 `<command>` 添加最后匹配的定义 `#definition`。' },
  },
  '\\AE': {
    mode: 'T',
    doc: { en: 'Æ', zh: '字符 Æ (U+00C6)。' },
  },
  '\\ae': {
    mode: 'T',
    doc: { en: 'æ', zh: '字符 æ (U+00E6)。' },
  },
  '\\alet': {
    mode: 'MT',
    signature: '\\alet <command1> <command2>',
    doc: { en: '', zh: '将命令 `<command2>` 的所有定义添加在命令 `<command1>` 的定义之后。' },
  },
  '\\Alph': {
    mode: 'MT',
    signature: '\\Alph{#counter}',
    doc: { en: '', zh: '将计数器 `#counter` 的值用大写拉丁字母写出。' },
  },
  '\\alph': {
    mode: 'MT',
    signature: '\\alph{#counter}',
    doc: { en: '', zh: '将计数器 `#counter` 的值用小写拉丁字母写出。' },
  },
  '\\Alpha': {
    mode: 'M',
    doc: { en: '', zh: '希腊字母 Α。' },
  },
  '\\alpha': {
    mode: 'M',
    doc: { en: '', zh: '希腊字母 α。' },
  },
  '\\arabic': {
    mode: 'MT',
    signature: '\\arabic{#counter}',
    doc: { en: '', zh: '将计数器 `#counter` 的值用数字写出。' },
  },
  '\\atop': {
    mode: 'M',
    signature: '{#upper \\atop #lower}',
    doc: { en: '', zh: '把 `#upper` 放在 `#lower` 上方。\n\n不推荐 — 建议使用 `\\substack`。' },
    deprecated: true,
  },
  '\\begin': {
    mode: 'MT',
    insertText: '\\begin{',
    signature: '\\begin{#environment}',
    doc: { en: '', zh: '进入环境 `#environment`。' },
  },
  '\\def': {
    mode: 'MT',
    signature: '\\def<command> <arguments> {#definition}',
    doc: { en: '', zh: '定义命令 `<command>`。' },
  },
  '\\end': {
    mode: 'MT',
    signature: '\\end{#environment}',
    // The doc is also used for precise \end{...} completion items.
    doc: { en: '', zh: '退出环境 `#environment`。' },
  },
};

export const environmentDictionary: { [key: string]: CompletionItem } = {
  align: {
    mode: 'T',
    doc: { en: '', zh: '插入对齐的多行公式。' },
  },
  'align*': {
    mode: 'T',
    doc: { en: '', zh: '插入对齐的多行公式。' },
  },
};

export const snippetDictionary: { [key: string]: CompletionItem } = {
  '\\left(': {
    mode: 'M',
    insertText: '\\left( ${0} \\right)',
    signature: '\\left( ... \\right)',
    doc: { en: '', zh: '插入一对括号。' },
  },
};

export interface Import {
  uri: monaco.Uri;
  content: string;
}

export const imports: Import[] = [];

export const initFileUrl =
  'https://raw.githubusercontent.com/banana-space/btex/main/src/lib/init.btx';
