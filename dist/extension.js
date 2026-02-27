"use strict";var I=Object.create;var f=Object.defineProperty;var L=Object.getOwnPropertyDescriptor;var U=Object.getOwnPropertyNames;var N=Object.getPrototypeOf,A=Object.prototype.hasOwnProperty;var V=(n,e)=>{for(var t in e)f(n,t,{get:e[t],enumerable:!0})},D=(n,e,t,o)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of U(e))!A.call(n,s)&&s!==t&&f(n,s,{get:()=>e[s],enumerable:!(o=L(e,s))||o.enumerable});return n};var d=(n,e,t)=>(t=n!=null?I(N(n)):{},D(e||!n||!n.__esModule?f(t,"default",{value:n,enumerable:!0}):t,n)),R=n=>D(f({},"__esModule",{value:!0}),n);var W={};V(W,{activate:()=>G,deactivate:()=>O});module.exports=R(W);var P=d(require("vscode"));var v=d(require("vscode")),b=class{constructor(){this.NS="faahcode"}get(){let e=v.workspace.getConfiguration(this.NS);return{enabled:e.get("enabled",!0),volume:e.get("volume",80),customSoundPath:e.get("customSoundPath",""),cooldownMs:e.get("cooldownMs",2e3),alerts:{diagnosticErrors:e.get("alerts.diagnosticErrors",!0),testFailures:e.get("alerts.testFailures",!0),terminalExitCode:e.get("alerts.terminalExitCode",!0)},quietHours:{enabled:e.get("quietHours.enabled",!1),start:e.get("quietHours.start","22:00"),end:e.get("quietHours.end","08:00")}}}toggle(){v.workspace.getConfiguration(this.NS).update("enabled",!this.get().enabled,v.ConfigurationTarget.Global)}dispose(){}};var w=d(require("child_process")),M=d(require("path")),T=d(require("fs")),E=class{constructor(e){this.defaultSound=M.join(e,"assets","sounds","faah.mp3")}play(e){let t=this.resolveSound(e);if(!t)return;let o=e.volume/100;console.time("sound"),this.spawnPlayer(t,o),console.timeEnd("sound")}resolveSound(e){return e.customSoundPath&&T.existsSync(e.customSoundPath)?e.customSoundPath:this.defaultSound}spawnPlayer(e,t){let o=this.buildCommand(e,t);o&&w.spawn(o.bin,o.args,{detached:!0,stdio:"ignore"}).unref()}buildCommand(e,t){let o=process.platform;return o==="darwin"?{bin:"afplay",args:[e,"-v",String(t)]}:o==="win32"?{bin:"powershell",args:["-NoProfile","-Command",`(New-Object Media.SoundPlayer '${e}').PlaySync()`]}:this.commandExists("paplay")?{bin:"paplay",args:["--volume",String(Math.round(t*65536)),e]}:{bin:"aplay",args:[e]}}commandExists(e){try{return w.execSync(`which ${e}`,{stdio:"ignore"}),!0}catch{return!1}}};var y=class{constructor(e){this.config=e;this.lastPlayed=0}allow(){let e=Date.now(),t=this.config.get();return!t.enabled||this.isQuietHours(t)||e-this.lastPlayed<t.cooldownMs?!1:(this.lastPlayed=e,!0)}isQuietHours(e){if(!e.quietHours.enabled)return!1;let t=new Date,[o,s]=e.quietHours.start.split(":").map(Number),[a,r]=e.quietHours.end.split(":").map(Number),u=t.getHours()*60+t.getMinutes(),g=o*60+s,m=a*60+r;return g<m?u>=g&&u<m:u>=g||u<m}dispose(){}};var l=d(require("vscode")),S=class{constructor(e,t,o){this.config=e;this.gate=t;this.engine=o;this.prev=new Map;this.sub=l.languages.onDidChangeDiagnostics(s=>this.onDiag(s));for(let[s,a]of l.languages.getDiagnostics()){let r=a.filter(u=>u.severity===l.DiagnosticSeverity.Error).length;this.prev.set(s.toString(),r)}}onDiag(e){let t=this.config.get();if(!t.enabled||!t.alerts.diagnosticErrors)return;let o=!1,s=e.uris.length>0?e.uris:l.languages.getDiagnostics().map(([a])=>a);for(let a of s){let r=l.workspace.textDocuments.find(F=>F.uri.toString()===a.toString());if(r&&r.isDirty)continue;let g=l.languages.getDiagnostics(a).filter(F=>F.severity===l.DiagnosticSeverity.Error).length,m=this.prev.get(a.toString())??0;g>m&&(o=!0),this.prev.set(a.toString(),g)}o&&this.gate.allow()?(console.log("[DiagnosticWatcher] New error detected, playing sound"),this.engine.play(t)):o&&console.log("[DiagnosticWatcher] New error detected, but gate blocked playback")}dispose(){this.sub.dispose()}};var h=d(require("vscode")),x=class{constructor(e,t,o){this.config=e;this.gate=t;this.engine=o;this.subs=[h.window.onDidCloseTerminal(s=>this.onTerminalClose(s)),h.window.onDidEndTerminalShellExecution(s=>this.onShellExecutionEnd(s)),h.tasks.onDidEndTask(s=>this.onTaskEnd(s))]}onTerminalClose(e){var o;if(!this.config.get().alerts.terminalExitCode)return;let t=(o=e.exitStatus)==null?void 0:o.code;t!==void 0&&t!==0&&this.tryPlay()}onTaskEnd(e){this.config.get().alerts.terminalExitCode}onShellExecutionEnd(e){if(!this.config.get().alerts.terminalExitCode)return;let t=e.exitCode;t!==void 0&&t!==0&&this.tryPlay()}tryPlay(){this.gate.allow()&&this.engine.play(this.config.get())}dispose(){this.subs.forEach(e=>e.dispose())}};var q=d(require("vscode")),B=[/^FAIL\b/m,/● Test suite failed to run/m,/\d+ failing/m,/FAILED/m,/^--- FAIL/m,/Tests\s+\d+\s+failed/m,/AssertionError/m],C=class{constructor(e,t,o){this.config=e;this.gate=t;this.engine=o;this.buffers=new Map;this.BUFFER_SIZE=512;this.subs=[q.window.onDidStartTerminalShellExecution(s=>this.onExecutionStart(s)),q.window.onDidEndTerminalShellExecution(s=>this.onExecutionEnd(s))]}onExecutionStart(e){let t=e.terminal.name+e.terminal.processId;this.consumeExecutionOutput(t,e.execution)}async consumeExecutionOutput(e,t){try{for await(let o of t.read()){if(!this.config.get().alerts.testFailures)return;let s=((this.buffers.get(e)??"")+o).slice(-this.BUFFER_SIZE);this.buffers.set(e,s),B.some(r=>r.test(s))&&this.gate.allow()&&this.engine.play(this.config.get())}}catch{}}onExecutionEnd(e){if(!this.config.get().alerts.testFailures)return;let t=e.terminal.name+e.terminal.processId,o=this.buffers.get(t)??"";if(B.some(a=>a.test(o)))return;let s=e.execution.commandLine.value;/\bFAIL\b/.test(s)&&this.gate.allow()&&this.engine.play(this.config.get())}dispose(){this.subs.forEach(e=>e.dispose()),this.buffers.clear()}};var p=d(require("vscode")),k=class{constructor(e){this.config=e;this.item=p.window.createStatusBarItem(p.StatusBarAlignment.Right,100),this.item.command="faahcode.toggle",this.item.tooltip="FaahCode: Click to toggle sound alerts",this.refresh(),this.item.show(),this.sub=p.workspace.onDidChangeConfiguration(t=>{t.affectsConfiguration("faahcode")&&this.refresh()})}refresh(){let e=this.config.get().enabled;this.item.text=e?"$(unmute) Faah":"$(mute) Faah",this.item.color=e?void 0:new p.ThemeColor("statusBarItem.warningForeground")}dispose(){this.item.dispose(),this.sub.dispose()}};var i=d(require("vscode")),c=class c{constructor(e){this.disposables=[];this.panel=e,this.panel.webview.html=this.getHtml(),this.postCurrentConfig(),this.panel.onDidDispose(()=>this.dispose(),null,this.disposables),this.panel.webview.onDidReceiveMessage(t=>this.onMessage(t),null,this.disposables),this.disposables.push(i.workspace.onDidChangeConfiguration(t=>{t.affectsConfiguration("faahcode")&&this.postCurrentConfig()}))}static createOrShow(e){var s;let t=(s=i.window.activeTextEditor)==null?void 0:s.viewColumn;if(c.currentPanel){c.currentPanel.panel.reveal(t),c.currentPanel.postCurrentConfig();return}let o=i.window.createWebviewPanel(c.viewType,"FaahCode Settings",t??i.ViewColumn.One,{enableScripts:!0,localResourceRoots:[e]});c.currentPanel=new c(o)}getConfig(){let e=i.workspace.getConfiguration("faahcode");return{enabled:e.get("enabled",!0),volume:e.get("volume",80),customSoundPath:e.get("customSoundPath",""),diagnosticErrors:e.get("alerts.diagnosticErrors",!0),testFailures:e.get("alerts.testFailures",!0),terminalExitCode:e.get("alerts.terminalExitCode",!0),quietHoursEnabled:e.get("quietHours.enabled",!1),quietHoursStart:e.get("quietHours.start","22:00"),quietHoursEnd:e.get("quietHours.end","08:00")}}postCurrentConfig(){this.panel.webview.postMessage({type:"state",payload:this.getConfig()})}async onMessage(e){switch(e.type){case"ready":this.postCurrentConfig();return;case"updateSetting":{await i.workspace.getConfiguration("faahcode").update(e.key,e.value,i.ConfigurationTarget.Global);return}case"browseSound":{let t=await i.window.showOpenDialog({canSelectMany:!1,canSelectFiles:!0,canSelectFolders:!1,filters:{Audio:["mp3","wav","ogg"]},openLabel:"Use Sound File"});t&&t.length>0&&(await i.workspace.getConfiguration("faahcode").update("customSoundPath",t[0].fsPath,i.ConfigurationTarget.Global),this.postCurrentConfig());return}case"playTestSound":await i.commands.executeCommand("faahcode.testSound");return}}getHtml(){return`<!DOCTYPE html>
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
</html>`}dispose(){for(c.currentPanel=void 0;this.disposables.length;){let e=this.disposables.pop();e&&e.dispose()}}};c.viewType="faahcode.settingsPanel";var H=c;function G(n){let e=new b,t=new E(n.extensionPath),o=new y(e),s=new k(e),a=new S(e,o,t),r=new x(e,o,t),u=new C(e,o,t);n.subscriptions.push(e,s,a,r,u,P.commands.registerCommand("faahcode.toggle",()=>e.toggle()),P.commands.registerCommand("faahcode.testSound",()=>t.play(e.get())),P.commands.registerCommand("faahcode.openSettings",()=>H.createOrShow(n.extensionUri)))}function O(){}0&&(module.exports={activate,deactivate});
