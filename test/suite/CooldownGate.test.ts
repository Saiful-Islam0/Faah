import * as assert from 'assert';
import { CooldownGate } from '../../src/CooldownGate';

type ConfigLike = {
  enabled: boolean;
  cooldownMs: number;
  quietHours: { enabled: boolean; start: string; end: string };
};

function makeConfig(overrides: Partial<ConfigLike> = {}) {
  const cfg: ConfigLike = {
    enabled: true,
    cooldownMs: 2000,
    quietHours: { enabled: false, start: '22:00', end: '08:00' },
    ...overrides,
  };
  return { get: () => cfg };
}

function withMockedDate(hour: number, minute: number, nowMs: number, run: () => void): void {
  const RealDate = Date;
  const realNow = Date.now;

  class FakeDate {
    static now() { return nowMs; }
    getHours() { return hour; }
    getMinutes() { return minute; }
  }

  (global as any).Date = FakeDate as any;
  Date.now = () => nowMs;
  try {
    run();
  } finally {
    (global as any).Date = RealDate;
    Date.now = realNow;
  }
}

suite('CooldownGate', () => {
  test('allow() returns true on first call', () => {
    const gate = new CooldownGate(makeConfig() as any);
    assert.strictEqual(gate.allow(), true);
  });

  test('allow() returns false when called again within cooldownMs', () => {
    let now = 5000;
    const realNow = Date.now;
    Date.now = () => now;
    try {
      const gate = new CooldownGate(makeConfig({ cooldownMs: 2000 }) as any);
      assert.strictEqual(gate.allow(), true);
      now = 1500;
      assert.strictEqual(gate.allow(), false);
    } finally {
      Date.now = realNow;
    }
  });

  test('allow() returns true again after cooldownMs has elapsed', () => {
    let now = 5000;
    const realNow = Date.now;
    Date.now = () => now;
    try {
      const gate = new CooldownGate(makeConfig({ cooldownMs: 2000 }) as any);
      assert.strictEqual(gate.allow(), true);
      now = 8001;
      assert.strictEqual(gate.allow(), true);
    } finally {
      Date.now = realNow;
    }
  });

  test('allow() returns false when enabled is false', () => {
    const gate = new CooldownGate(makeConfig({ enabled: false }) as any);
    assert.strictEqual(gate.allow(), false);
  });

  test('Quiet hours: returns false when current time is inside a same-day window', () => {
    withMockedDate(10, 0, 5000, () => {
      const gate = new CooldownGate(makeConfig({
        quietHours: { enabled: true, start: '09:00', end: '17:00' },
      }) as any);
      assert.strictEqual(gate.allow(), false);
    });
  });

  test('Quiet hours: returns false when current time is inside an overnight window', () => {
    withMockedDate(23, 0, 5000, () => {
      const gate = new CooldownGate(makeConfig({
        quietHours: { enabled: true, start: '22:00', end: '08:00' },
      }) as any);
      assert.strictEqual(gate.allow(), false);
    });
  });

  test('Quiet hours: returns true when current time is outside the window', () => {
    withMockedDate(12, 0, 5000, () => {
      const gate = new CooldownGate(makeConfig({
        quietHours: { enabled: true, start: '22:00', end: '08:00' },
      }) as any);
      assert.strictEqual(gate.allow(), true);
    });
  });
});
