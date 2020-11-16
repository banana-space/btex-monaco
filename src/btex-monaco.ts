import * as monaco from 'monaco-editor';
import { options } from './lib/common';
import { btexCompletionItemProvider } from './lib/CompletionItemProvider';
import { onDidChangeCursorPosition, onDidChangeModelContent } from './lib/handlers';
import { btexLanguageConfiguration } from './lib/LanguageConfiguration';
import { btexTokensProvider } from './lib/TokensProvider';
import { StorageService } from './lib/StorageService';
import { btexLightTheme } from './lib/themes';
import { btexDefinitionProvider, overrideGoToDefinition } from './lib/DefinitionProvider';
import { imports, initFileUrl } from './lib/data';

// Fix Firefox clipboard issue
if (!navigator.clipboard.readText) {
  navigator.clipboard.readText = function () {
    return new Promise<string>((resolve) => resolve(''));
  };
}

function registerLanguage() {
  monaco.languages.register({ id: 'btex' });
  monaco.languages.setMonarchTokensProvider('btex', btexTokensProvider);
  monaco.languages.setLanguageConfiguration('btex', btexLanguageConfiguration);
  monaco.languages.registerCompletionItemProvider('btex', btexCompletionItemProvider);
  monaco.languages.registerDefinitionProvider('btex', btexDefinitionProvider);

  // TODO: symbol provider for sections, labels, etc.
  // TODO: formatting provider for auto indent

  monaco.editor.defineTheme('btex-light', btexLightTheme);

  // Fetch init.btx
  fetch(initFileUrl).then(async (value) => {
    addImport('/init.btx', await value.text());
  });
}

registerLanguage();

function initializeEditor(editor: monaco.editor.IStandaloneCodeEditor) {
  editor.updateOptions({
    detectIndentation: false,
    wordBasedSuggestions: false,
    // removed @, added _
    wordSeparators: '`~!#$%^&*()-_=+[{]}\\|;:\'",.<>/?',
  });
  editor.onDidChangeModelContent((e) => onDidChangeModelContent(editor, e));
  editor.onDidChangeCursorPosition((e) => onDidChangeCursorPosition(editor, e));

  overrideGoToDefinition(editor);
}

export function setLocale(locale: 'en' | 'zh') {
  options.locale = locale;
}

export function createEditor(element: HTMLElement): monaco.editor.IStandaloneCodeEditor {
  let storage = new StorageService();
  storage.store('expandSuggestionDocs', true, 0);

  let editor = monaco.editor.create(
    element,
    {
      language: 'btex',
      theme: 'btex-light',
    },
    {
      storageService: storage,
    }
  );

  initializeEditor(editor);
  return editor;
}

export function addImport(uri: string, content: string) {
  let fileUri = monaco.Uri.file(uri);
  imports.push({ uri: fileUri, content });
  monaco.editor.createModel(content, 'btex', fileUri);
}
