import * as vscode from 'vscode';
import { ConfigManager } from './ConfigManager';
import { CooldownGate } from './CooldownGate';
import { SoundEngine } from './SoundEngine';

export class DiagnosticWatcher implements vscode.Disposable {
  private readonly sub: vscode.Disposable;
  private prev = new Map<string, number>(); // uri -> error count

  constructor(
    private config: ConfigManager,
    private gate: CooldownGate,
    private engine: SoundEngine
  ) {
    this.sub = vscode.languages.onDidChangeDiagnostics(e => this.onDiag(e));
    for (const [uri, diags] of vscode.languages.getDiagnostics()) {
      const errors = diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
      this.prev.set(uri.toString(), errors);
    }
  }

  private onDiag(e: vscode.DiagnosticChangeEvent): void {
    const cfg = this.config.get();
    if (!cfg.enabled) return;
    if (!cfg.alerts.diagnosticErrors) return;
    let hasNewError = false;
    const uris = e.uris.length > 0
      ? e.uris
      : vscode.languages.getDiagnostics().map(([uri]) => uri);

    for (const uri of uris) {
      const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());
      if (doc && doc.isDirty) {
        continue;
      }
      const diags = vscode.languages.getDiagnostics(uri);
      const errors = diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
      const prev = this.prev.get(uri.toString()) ?? 0;
      if (errors > prev) hasNewError = true;
      this.prev.set(uri.toString(), errors);
    }
    if (hasNewError && this.gate.allow()) {
      console.log('[DiagnosticWatcher] New error detected, playing sound');
      this.engine.play(cfg);
    } else if (hasNewError) {
      console.log('[DiagnosticWatcher] New error detected, but gate blocked playback');
    }
  }

  dispose() { this.sub.dispose(); }
}
