import * as vscode from 'vscode';
import { ConfigManager } from './ConfigManager';

export class CooldownGate implements vscode.Disposable {
  private lastPlayed = 0;

  constructor(private config: ConfigManager) {}

  // Returns true if the caller is allowed to play a sound right now
  allow(): boolean {
    const now = Date.now();
    const cfg = this.config.get();
    if (!cfg.enabled) return false;
    if (this.isQuietHours(cfg)) return false;
    if (now - this.lastPlayed < cfg.cooldownMs) return false;
    this.lastPlayed = now;
    return true;
  }

  private isQuietHours(cfg: ReturnType<ConfigManager['get']>): boolean {
    if (!cfg.quietHours.enabled) return false;
    const now = new Date();
    const [sh, sm] = cfg.quietHours.start.split(':').map(Number);
    const [eh, em] = cfg.quietHours.end.split(':').map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();gdfhdsfh
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (startMins < endMins) return nowMins >= startMins && nowMins < endMins;
    return nowMins >= startMins || nowMins < endMins; // overnight wrap
  }

  dispose() {}
}
