import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { FaahConfig } from './types';

export class SoundEngine {
  private readonly defaultSound: string;

  constructor(extensionPath: string) {
    this.defaultSound = path.join(extensionPath, 'assets', 'sounds', 'faah.mp3');
  }

  play(config: FaahConfig): void {
    const filePath = this.resolveSound(config);
    if (!filePath) return;
    const vol = config.volume / 100;  // normalize to 0.0-1.0
    console.time('sound');
    this.spawnPlayer(filePath, vol);
    console.timeEnd('sound');
  }

  private resolveSound(config: FaahConfig): string | null {
    if (config.customSoundPath && fs.existsSync(config.customSoundPath)) {
      return config.customSoundPath;
    }
    return this.defaultSound;
  }

  private spawnPlayer(filePath: string, volume: number): void {
    const cmd = this.buildCommand(filePath, volume);
    if (!cmd) return;
    cp.spawn(cmd.bin, cmd.args, { detached: true, stdio: 'ignore' }).unref();
  }

  private buildCommand(f: string, vol: number) {
    const p = process.platform;
    if (p === 'darwin') {
      return { bin: 'afplay', args: [f, '-v', String(vol)] };
    }
    if (p === 'win32') {
      const ps = `(New-Object Media.SoundPlayer '${f}').PlaySync()`;
      return { bin: 'powershell', args: ['-NoProfile', '-Command', ps] };
    }
    // Linux - try paplay, fall back to aplay
    if (this.commandExists('paplay')) {
      return { bin: 'paplay', args: ['--volume', String(Math.round(vol * 65536)), f] };
    }
    return { bin: 'aplay', args: [f] };
  }

  private commandExists(cmd: string): boolean {
    try { cp.execSync(`which ${cmd}`, { stdio: 'ignore' }); return true; }
    catch { return false; }
  }
}
