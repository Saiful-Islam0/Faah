import * as vscode from 'vscode';
import { FaahConfig } from './types';

export class ConfigManager implements vscode.Disposable {
  private readonly NS = 'faahcode';

  get(): FaahConfig {
    const c = vscode.workspace.getConfiguration(this.NS);
    return {
      enabled:         c.get<boolean>('enabled', true),
      volume:          c.get<number>('volume', 80),
      customSoundPath: c.get<string>('customSoundPath', ''),
      cooldownMs:      c.get<number>('cooldownMs', 2000),
      alerts: {
        diagnosticErrors: c.get<boolean>('alerts.diagnosticErrors', true),
        testFailures:     c.get<boolean>('alerts.testFailures', true),
        terminalExitCode: c.get<boolean>('alerts.terminalExitCode', true),
      },
      quietHours: {
        enabled: c.get<boolean>('quietHours.enabled', false),
        start:   c.get<string>('quietHours.start', '22:00'),
        end:     c.get<string>('quietHours.end', '08:00'),
      }
    };
  }

  toggle(): void {
    const cfg = vscode.workspace.getConfiguration(this.NS);
    cfg.update('enabled', !this.get().enabled, vscode.ConfigurationTarget.Global);
  }

  dispose() {}
}
