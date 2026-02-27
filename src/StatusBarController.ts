import * as vscode from 'vscode';
import { ConfigManager } from './ConfigManager';

export class StatusBarController implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private readonly sub: vscode.Disposable;

  constructor(private config: ConfigManager) {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right, 100
    );
    this.item.command = 'faahcode.toggle';
    this.item.tooltip = 'FaahCode: Click to toggle sound alerts';
    this.refresh();
    this.item.show();
    this.sub = vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('faahcode')) this.refresh();
    });
  }

  private refresh(): void {
    const on = this.config.get().enabled;
    this.item.text = on ? '$(unmute) Faah' : '$(mute) Faah';
    this.item.color = on ? undefined : new vscode.ThemeColor('statusBarItem.warningForeground');
  }

  dispose() { this.item.dispose(); this.sub.dispose(); }
}
