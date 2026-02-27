const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const Mocha = require('mocha');
const Module = require('module');

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'vscode') {
    return {
      window: {
        onDidStartTerminalShellExecution: () => ({ dispose() {} }),
        onDidEndTerminalShellExecution: () => ({ dispose() {} }),
      },
      workspace: {
        onDidChangeConfiguration: () => ({ dispose() {} }),
        textDocuments: [],
      },
      tasks: {
        onDidEndTask: () => ({ dispose() {} }),
      },
      StatusBarAlignment: { Right: 2 },
      ThemeColor: class ThemeColor {},
    };
  }
  return originalLoad(request, parent, isMain);
};

require.extensions['.ts'] = function registerTs(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const mocha = new Mocha({ ui: 'tdd', color: true });
mocha.addFile(path.join(__dirname, 'suite', 'CooldownGate.test.ts'));
mocha.addFile(path.join(__dirname, 'suite', 'TestOutputParser.test.ts'));
mocha.addFile(path.join(__dirname, 'suite', 'SoundEngine.test.ts'));

mocha.run(failures => {
  process.exitCode = failures ? 1 : 0;
});
