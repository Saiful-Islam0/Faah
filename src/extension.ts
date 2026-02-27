import * as vscode from 'vscode';
import { ConfigManager }        from './ConfigManager';
import { SoundEngine }          from './SoundEngine';
import { CooldownGate }         from './CooldownGate';
import { DiagnosticWatcher }    from './DiagnosticWatcher';
import { TerminalWatcher }      from './TerminalWatcher';
import { TestOutputParser }     from './TestOutputParser';
import { StatusBarController }  from './StatusBarController';
import { SettingsPanel }        from './SettingsPanel';

export function activate(context: vscode.ExtensionContext) {
  const config     = new ConfigManager();
  const engine     = new SoundEngine(context.extensionPath);
  const cooldown   = new CooldownGate(config);
  const statusBar  = new StatusBarController(config);
  const diagWatcher  = new DiagnosticWatcher(config, cooldown, engine);
  const termWatcher  = new TerminalWatcher(config, cooldown, engine);
  const testParser   = new TestOutputParser(config, cooldown, engine);

  context.subscriptions.push(
    config, statusBar, diagWatcher, termWatcher, testParser,
    vscode.commands.registerCommand('faahcode.toggle', () => config.toggle()),
    vscode.commands.registerCommand('faahcode.testSound', () => engine.play(config.get())),
    vscode.commands.registerCommand('faahcode.openSettings', () => SettingsPanel.createOrShow(context.extensionUri))
  );
}

export function deactivate() {}
