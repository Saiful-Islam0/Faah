import * as vscode from 'vscode';

type SettingsMessage =
  | { type: 'ready' }
  | { type: 'updateSetting'; key: string; value: string | number | boolean }
  | { type: 'browseSound' }
  | { type: 'playTestSound' };

export class SettingsPanel {
  private static currentPanel: SettingsPanel | undefined;
  private static readonly viewType = 'faahcode.settingsPanel';

  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];

  static createOrShow(extensionUri: vscode.Uri): void {
    const column = vscode.window.activeTextEditor?.viewColumn;

    if (SettingsPanel.currentPanel) {
      SettingsPanel.currentPanel.panel.reveal(column);
      SettingsPanel.currentPanel.postCurrentConfig();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      SettingsPanel.viewType,
      'FaahCode Settings',
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
      }
    );

    SettingsPanel.currentPanel = new SettingsPanel(panel);
  }

  private constructor(panel: vscode.WebviewPanel) {
    this.panel = panel;
    this.panel.webview.html = this.getHtml();
    this.postCurrentConfig();

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (message: SettingsMessage) => this.onMessage(message),
      null,
      this.disposables
    );

    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('faahcode')) this.postCurrentConfig();
      })
    );
  }

  private getConfig() {
    const c = vscode.workspace.getConfiguration('faahcode');
    return {
      enabled: c.get<boolean>('enabled', true),
      volume: c.get<number>('volume', 80),
      customSoundPath: c.get<string>('customSoundPath', ''),
      diagnosticErrors: c.get<boolean>('alerts.diagnosticErrors', true),
      testFailures: c.get<boolean>('alerts.testFailures', true),
      terminalExitCode: c.get<boolean>('alerts.terminalExitCode', true),
      quietHoursEnabled: c.get<boolean>('quietHours.enabled', false),
      quietHoursStart: c.get<string>('quietHours.start', '22:00'),
      quietHoursEnd: c.get<string>('quietHours.end', '08:00'),
    };
  }

  private postCurrentConfig(): void {
    this.panel.webview.postMessage({ type: 'state', payload: this.getConfig() });
  }

  private async onMessage(message: SettingsMessage): Promise<void> {
    switch (message.type) {
      case 'ready':
        this.postCurrentConfig();
        return;
      case 'updateSetting': {
        const cfg = vscode.workspace.getConfiguration('faahcode');
        await cfg.update(message.key, message.value, vscode.ConfigurationTarget.Global);
        return;
      }
      case 'browseSound': {
        const result = await vscode.window.showOpenDialog({
          canSelectMany: false,
          canSelectFiles: true,
          canSelectFolders: false,
          filters: {
            Audio: ['mp3', 'wav', 'ogg'],
          },
          openLabel: 'Use Sound File',
        });
        if (result && result.length > 0) {
          const cfg = vscode.workspace.getConfiguration('faahcode');
          await cfg.update('customSoundPath', result[0].fsPath, vscode.ConfigurationTarget.Global);
          this.postCurrentConfig();
        }
        return;
      }
      case 'playTestSound':
        await vscode.commands.executeCommand('faahcode.testSound');
        return;
    }
  }

  private getHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FaahCode Settings</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 16px;
      margin: 0;
    }
    h1 {
      font-size: 16px;
      margin: 0 0 14px 0;
    }
    .section {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
      background: var(--vscode-sideBar-background);
    }
    .row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 8px 0;
    }
    label {
      min-width: 180px;
    }
    input[type="text"], input[type="time"], input[type="range"] {
      width: 100%;
      max-width: 420px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 6px 8px;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: 1px solid var(--vscode-button-border);
      border-radius: 4px;
      padding: 6px 10px;
      cursor: pointer;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .checkbox-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 6px;
    }
    .checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .muted {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      margin-top: 6px;
    }
    #volumeValue {
      min-width: 48px;
      color: var(--vscode-descriptionForeground);
    }
  </style>
</head>
<body>
  <h1>FaahCode Settings</h1>

  <div class="section">
    <div class="row">
      <label for="enabled">Master Sound Alerts</label>
      <input id="enabled" type="checkbox" />
    </div>
  </div>

  <div class="section">
    <div class="row">
      <label for="volume">Volume</label>
      <input id="volume" type="range" min="0" max="100" step="1" />
      <span id="volumeValue">0%</span>
    </div>
  </div>

  <div class="section">
    <div class="row">
      <label for="customSoundPath">Custom Sound File</label>
      <input id="customSoundPath" type="text" placeholder="/absolute/path/to/sound.mp3" />
      <button id="browseBtn" type="button">Browse</button>
    </div>
    <div class="row">
      <label></label>
      <button id="testSoundBtn" type="button">Play Test Sound</button>
    </div>
    <div class="muted">Supported formats: .mp3, .wav, .ogg</div>
  </div>

  <div class="section">
    <div class="checkbox-grid">
      <label class="checkbox"><input id="diagnosticErrors" type="checkbox" /> Diagnostic Errors</label>
      <label class="checkbox"><input id="testFailures" type="checkbox" /> Test Failures</label>
      <label class="checkbox"><input id="terminalExitCode" type="checkbox" /> Terminal Exit Code</label>
    </div>
  </div>

  <div class="section">
    <div class="row">
      <label for="quietHoursEnabled">Quiet Hours Enabled</label>
      <input id="quietHoursEnabled" type="checkbox" />
    </div>
    <div class="row">
      <label for="quietHoursStart">Quiet Hours Start</label>
      <input id="quietHoursStart" type="time" />
    </div>
    <div class="row">
      <label for="quietHoursEnd">Quiet Hours End</label>
      <input id="quietHoursEnd" type="time" />
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    const enabled = document.getElementById('enabled');
    const volume = document.getElementById('volume');
    const volumeValue = document.getElementById('volumeValue');
    const customSoundPath = document.getElementById('customSoundPath');
    const browseBtn = document.getElementById('browseBtn');
    const testSoundBtn = document.getElementById('testSoundBtn');
    const diagnosticErrors = document.getElementById('diagnosticErrors');
    const testFailures = document.getElementById('testFailures');
    const terminalExitCode = document.getElementById('terminalExitCode');
    const quietHoursEnabled = document.getElementById('quietHoursEnabled');
    const quietHoursStart = document.getElementById('quietHoursStart');
    const quietHoursEnd = document.getElementById('quietHoursEnd');

    function postUpdate(key, value) {
      vscode.postMessage({ type: 'updateSetting', key, value });
    }

    function setVolumeLabel(value) {
      volumeValue.textContent = value + '%';
    }

    enabled.addEventListener('change', () => postUpdate('enabled', enabled.checked));
    volume.addEventListener('input', () => {
      const value = Number(volume.value);
      setVolumeLabel(value);
      postUpdate('volume', value);
    });
    customSoundPath.addEventListener('change', () => postUpdate('customSoundPath', customSoundPath.value.trim()));
    browseBtn.addEventListener('click', () => vscode.postMessage({ type: 'browseSound' }));
    testSoundBtn.addEventListener('click', () => vscode.postMessage({ type: 'playTestSound' }));
    diagnosticErrors.addEventListener('change', () => postUpdate('alerts.diagnosticErrors', diagnosticErrors.checked));
    testFailures.addEventListener('change', () => postUpdate('alerts.testFailures', testFailures.checked));
    terminalExitCode.addEventListener('change', () => postUpdate('alerts.terminalExitCode', terminalExitCode.checked));
    quietHoursEnabled.addEventListener('change', () => postUpdate('quietHours.enabled', quietHoursEnabled.checked));
    quietHoursStart.addEventListener('change', () => postUpdate('quietHours.start', quietHoursStart.value));
    quietHoursEnd.addEventListener('change', () => postUpdate('quietHours.end', quietHoursEnd.value));

    window.addEventListener('message', event => {
      const message = event.data;
      if (message.type !== 'state') return;
      const s = message.payload;
      enabled.checked = !!s.enabled;
      volume.value = String(s.volume ?? 80);
      setVolumeLabel(Number(volume.value));
      customSoundPath.value = s.customSoundPath ?? '';
      diagnosticErrors.checked = !!s.diagnosticErrors;
      testFailures.checked = !!s.testFailures;
      terminalExitCode.checked = !!s.terminalExitCode;
      quietHoursEnabled.checked = !!s.quietHoursEnabled;
      quietHoursStart.value = s.quietHoursStart ?? '22:00';
      quietHoursEnd.value = s.quietHoursEnd ?? '08:00';
    });

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
  }

  private dispose(): void {
    SettingsPanel.currentPanel = undefined;
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) d.dispose();
    }
  }
}
