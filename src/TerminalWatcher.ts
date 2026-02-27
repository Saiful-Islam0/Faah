import * as vscode from 'vscode';
import { ConfigManager } from './ConfigManager';
import { CooldownGate } from './CooldownGate';
import { SoundEngine } from './SoundEngine';

export class TerminalWatcher implements vscode.Disposable {
  private readonly subs: vscode.Disposable[];

  constructor(
    private config: ConfigManager,
    private gate: CooldownGate,
    private engine: SoundEngine
  ) {
    this.subs = [
      vscode.window.onDidCloseTerminal(t => this.onTerminalClose(t)),
      vscode.window.onDidEndTerminalShellExecution(e => this.onShellExecutionEnd(e)),
      vscode.tasks.onDidEndTask(e => this.onTaskEnd(e)),
    ];
  }

  private onTerminalClose(terminal: vscode.Terminal): void {
    if (!this.config.get().alerts.terminalExitCode) return;
    const code = terminal.exitStatus?.code;
    if (code !== undefined && code !== 0) this.tryPlay();
  }

  private onTaskEnd(e: vscode.TaskEndEvent): void {
    if (!this.config.get().alerts.terminalExitCode) return;
    // TaskEndEvent does not expose exit code - handled via onDidCloseTerminal
    // This hook is reserved for future task-specific enrichment
  }

  private onShellExecutionEnd(e: vscode.TerminalShellExecutionEndEvent): void {
    if (!this.config.get().alerts.terminalExitCode) return;
    const code = e.exitCode;
    if (code !== undefined && code !== 0) this.tryPlay();
  }

  private tryPlay(): void {
    if (this.gate.allow()) this.engine.play(this.config.get());
  }

  dispose() { this.subs.forEach(s => s.dispose()); }
}
