import * as assert from 'assert';
import { SoundEngine } from '../../src/SoundEngine';

const cp = require('child_process') as typeof import('child_process');
const fs = require('fs') as typeof import('fs');

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
const originalSpawn = cp.spawn;
const originalExecSync = cp.execSync;
const originalExistsSync = fs.existsSync;

function setPlatform(value: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value });
}

suite('SoundEngine', () => {
  teardown(() => {
    if (originalPlatform) {
      Object.defineProperty(process, 'platform', originalPlatform);
    }
    (cp as any).spawn = originalSpawn;
    (cp as any).execSync = originalExecSync;
    (fs as any).existsSync = originalExistsSync;
  });

  test('uses afplay on macOS and normalizes volume 100 to 1.0', () => {
    setPlatform('darwin');
    let spawnArgs: any[] = [];
    (cp as any).spawn = (...args: any[]) => {
      spawnArgs = args;
      return { unref: () => {} };
    };
    (fs as any).existsSync = () => false;

    const engine = new SoundEngine('/ext');
    engine.play({
      enabled: true,
      volume: 100,
      customSoundPath: '',
      cooldownMs: 2000,
      alerts: { diagnosticErrors: true, testFailures: true, terminalExitCode: true },
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
    });

    assert.strictEqual(spawnArgs[0], 'afplay');
    assert.deepStrictEqual(spawnArgs[1], ['/ext/assets/sounds/faah.mp3', '-v', '1']);
  });

  test('uses paplay on linux and normalizes volume 100 to 65536', () => {
    setPlatform('linux');
    let spawnArgs: any[] = [];
    (cp as any).spawn = (...args: any[]) => {
      spawnArgs = args;
      return { unref: () => {} };
    };
    (cp as any).execSync = () => Buffer.from('');
    (fs as any).existsSync = () => false;

    const engine = new SoundEngine('/ext');
    engine.play({
      enabled: true,
      volume: 100,
      customSoundPath: '',
      cooldownMs: 2000,
      alerts: { diagnosticErrors: true, testFailures: true, terminalExitCode: true },
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
    });

    assert.strictEqual(spawnArgs[0], 'paplay');
    assert.deepStrictEqual(spawnArgs[1], ['--volume', '65536', '/ext/assets/sounds/faah.mp3']);
  });

  test('falls back to aplay on linux when paplay is unavailable', () => {
    setPlatform('linux');
    let spawnArgs: any[] = [];
    (cp as any).spawn = (...args: any[]) => {
      spawnArgs = args;
      return { unref: () => {} };
    };
    (cp as any).execSync = () => { throw new Error('not found'); };
    (fs as any).existsSync = () => false;

    const engine = new SoundEngine('/ext');
    engine.play({
      enabled: true,
      volume: 80,
      customSoundPath: '',
      cooldownMs: 2000,
      alerts: { diagnosticErrors: true, testFailures: true, terminalExitCode: true },
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
    });

    assert.strictEqual(spawnArgs[0], 'aplay');
    assert.deepStrictEqual(spawnArgs[1], ['/ext/assets/sounds/faah.mp3']);
  });

  test('uses powershell on win32', () => {
    setPlatform('win32');
    let spawnArgs: any[] = [];
    (cp as any).spawn = (...args: any[]) => {
      spawnArgs = args;
      return { unref: () => {} };
    };
    (fs as any).existsSync = () => false;

    const engine = new SoundEngine('/ext');
    engine.play({
      enabled: true,
      volume: 80,
      customSoundPath: '',
      cooldownMs: 2000,
      alerts: { diagnosticErrors: true, testFailures: true, terminalExitCode: true },
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
    });

    assert.strictEqual(spawnArgs[0], 'powershell');
    assert.strictEqual(spawnArgs[1][0], '-NoProfile');
    assert.strictEqual(spawnArgs[1][1], '-Command');
  });

  test('uses custom sound path when it exists', () => {
    setPlatform('darwin');
    let spawnArgs: any[] = [];
    (cp as any).spawn = (...args: any[]) => {
      spawnArgs = args;
      return { unref: () => {} };
    };
    (fs as any).existsSync = (p: string) => p === '/tmp/custom.mp3';

    const engine = new SoundEngine('/ext');
    engine.play({
      enabled: true,
      volume: 50,
      customSoundPath: '/tmp/custom.mp3',
      cooldownMs: 2000,
      alerts: { diagnosticErrors: true, testFailures: true, terminalExitCode: true },
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
    });

    assert.deepStrictEqual(spawnArgs[1], ['/tmp/custom.mp3', '-v', '0.5']);
  });

  test('uses default sound path when custom sound path is empty', () => {
    setPlatform('darwin');
    let spawnArgs: any[] = [];
    (cp as any).spawn = (...args: any[]) => {
      spawnArgs = args;
      return { unref: () => {} };
    };
    (fs as any).existsSync = () => false;

    const engine = new SoundEngine('/ext');
    engine.play({
      enabled: true,
      volume: 80,
      customSoundPath: '',
      cooldownMs: 2000,
      alerts: { diagnosticErrors: true, testFailures: true, terminalExitCode: true },
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
    });

    assert.deepStrictEqual(spawnArgs[1], ['/ext/assets/sounds/faah.mp3', '-v', '0.8']);
  });

  test('uses default sound path when custom sound path is invalid', () => {
    setPlatform('darwin');
    let spawnArgs: any[] = [];
    (cp as any).spawn = (...args: any[]) => {
      spawnArgs = args;
      return { unref: () => {} };
    };
    (fs as any).existsSync = () => false;

    const engine = new SoundEngine('/ext');
    engine.play({
      enabled: true,
      volume: 80,
      customSoundPath: '/tmp/missing.mp3',
      cooldownMs: 2000,
      alerts: { diagnosticErrors: true, testFailures: true, terminalExitCode: true },
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
    });

    assert.deepStrictEqual(spawnArgs[1], ['/ext/assets/sounds/faah.mp3', '-v', '0.8']);
  });
});
