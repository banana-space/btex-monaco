import * as monaco from 'monaco-editor';
import { options } from './common';

export interface LineStructureToken {
  tag: string;
  startColumn: number;
  endColumn: number;
}

export interface StructureAnalyserResult {
  [lineNumber: number]: LineStructureToken[];
}

// This is basically a tokeniser that only does partail job.
export const btexStructureAnalyser = {
  analyse: function (
    model: monaco.editor.ITextModel,
    range?: monaco.IRange
  ): StructureAnalyserResult {
    let result: StructureAnalyserResult = {};

    let start = range?.startLineNumber ?? 1,
      end = range?.endLineNumber ?? model.getLineCount();

    for (let l = start; l <= end; l++) {
      result[l] ??= [];
      let tokens = result[l];

      let line = model.getLineContent(l);
      if (line.length > options.maxParsedLineLength) continue;
      line = line.replace(/\\\\/g, '  ').replace(/(^|[^\\])%.*/, '$1');

      let column = 1;
      while (line.length > 0) {
        switch (line[0]) {
          case '{':
          case '}':
          case '$':
            tokens.push({ tag: line[0], startColumn: column, endColumn: column + 1 });
            line = line.substring(1);
            column++;
            continue;

          case '\\':
            if ('[]()'.includes(line[1])) {
              tokens.push({ tag: '\\' + line[1], startColumn: column, endColumn: column + 2 });
              line = line.substring(2);
              column += 2;
              continue;
            }

            let match = line.match(/^\\(begin|end)\s*(\{[^\{\}\\]*\})/);
            if (match) {
              tokens.push({
                tag: '\\' + match[1] + match[2],
                startColumn: column,
                endColumn: column + match[0].length,
              });
              line = line.substring(match[0].length);
              column += match[0].length;
              continue;
            }

            match =
              line.match(/^(\\@?(re)?newcommand(\s*\*)?)\s*\{\s*(\\[a-zA-Z]+|.?)?\s*\}/) ||
              line.match(/^(\\@?([aegpt@]?def|(re)?newcommand(\s*\*)?))/);
            if (match) {
              tokens.push({
                tag: 'def',
                startColumn: column,
                endColumn: column + match[1].length,
              });
              line = line.substring(match[1].length);
              column += match[1].length;
              continue;
            }

            match = line.match(/^\\(?:@?env[ap]?(def)|(re)?newenvironment(\s*\*)?)/);
            if (match) {
              tokens.push({
                tag: match[1] === 'def' ? 'envdef' : 'newenv',
                startColumn: column,
                endColumn: column + match[0].length,
              });
              line = line.substring(match[0].length);
              column += match[0].length;
              continue;
            }

            // Skip \{ etc.
            line = line.substring(2);
            column += 2;
            continue;

          case '#':
            let argMatch = line.match(/^#+.?/);
            let matchLength = argMatch ? argMatch[0].length : 1;
            line = line.substring(matchLength);
            column += matchLength;
            continue;

          default:
            line = line.substring(1);
            column++;
            continue;
        }
      }
    }

    return result;
  },
};
