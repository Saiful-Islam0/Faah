import * as vscode from 'vscode';
import { ConfigManager } from './ConfigManager';
import { CooldownGate } from './CooldownGate';
import { SoundEngine } from './SoundEngine';

const FAILURE_PATTERNS: RegExp[] = [
  /^FAIL\b/m,                    // Jest
  /● Test suite failed to run/m, // Jest
  /\d+ failing/m,                // Mocha
  /FAILED/m,                     // PyTest
  /^--- FAIL/m,                  // Go test
  /Tests\s+\d+\s+failed/m,       // Vitest
  /AssertionError/m,             // Node assert / chai
];

export class TestOutputParser implements vscode.Disposable {
  private readonly subs: vscode.Disposable[];
  private buffers = new Map<string, string>(); // terminal id -> buffer
  private readonly BUFFER_SIZE = 512;

  constructor(
    private config: ConfigManager,
    private gate: CooldownGate,
    private engine: SoundEngine
  ) {
    this.subs = [
      vscode.window.onDidStartTerminalShellExecution(e => this.onExecutionStart(e)),
      vscode.window.onDidEndTerminalShellExecution(e => this.onExecutionEnd(e)),
    ];
  }

  private onExecutionStart(e: vscode.TerminalShellExecutionStartEvent): void {
    const id = e.terminal.name + e.terminal.processId;
    void this.consumeExecutionOutput(id, e.execution);
  }

  private async consumeExecutionOutput(id: string, execution: vscode.TerminalShellExecution): Promise<void> {
    try {
      for await (const data of execution.read()) {
        if (!this.config.get().alerts.testFailures) return;
        const buf = ((this.buffers.get(id) ?? '') + data).slice(-this.BUFFER_SIZE);
        this.buffers.set(id, buf);
        const matched = FAILURE_PATTERNS.some(p => p.test(buf));
        if (matched && this.gate.allow()) {
          this.engine.play(this.config.get());
        }
      }
    } catch {
      // Some terminal integrations may not provide a readable stream reliably.
    }
  }

  private onExecutionEnd(e: vscode.TerminalShellExecutionEndEvent): void {
    if (!this.config.get().alerts.testFailures) return;
    const id = e.terminal.name + e.terminal.processId;
    const buf = this.buffers.get(id) ?? '';
    if (FAILURE_PATTERNS.some(p => p.test(buf))) return;

    // Fallback: detect explicit FAIL markers in echoed command text when stream data is unavailable.
    const cmd = e.execution.commandLine.value;
    if (/\bFAIL\b/.test(cmd) && this.gate.allow()) {
      this.engine.play(this.config.get());
    }
  }

  dispose() { this.subs.forEach(s => s.dispose()); this.buffers.clear(); }
}
