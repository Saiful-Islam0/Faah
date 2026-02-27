import * as assert from 'assert';
import { TestOutputParser } from '../../src/TestOutputParser';

function makeConfig() {
  return {
    get: () => ({
      alerts: { testFailures: true },
      enabled: true,
      volume: 80,
      customSoundPath: '',
      cooldownMs: 2000,
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
    }),
  };
}

async function feed(parser: any, id: string, text: string): Promise<void> {
  const execution = {
    read: async function* () {
      yield text;
    },
  };
  await parser.consumeExecutionOutput(id, execution);
}

function createParser() {
  let plays = 0;
  const engine = { play: () => { plays += 1; } };
  const gate = { allow: () => true };
  const parser = new TestOutputParser(makeConfig() as any, gate as any, engine as any) as any;
  return { parser, getPlays: () => plays };
}

suite('TestOutputParser', () => {
  test('Jest /^FAIL\\b/m matches', async () => {
    const { parser, getPlays } = createParser();
    await feed(parser, 't1', 'FAIL src/app.test.ts');
    assert.strictEqual(getPlays(), 1);
    parser.dispose();
  });

  test('Jest /^FAIL\\b/m does not match PASS', async () => {
    const { parser, getPlays } = createParser();
    await feed(parser, 't1', 'PASS src/app.test.ts');
    assert.strictEqual(getPlays(), 0);
    parser.dispose();
  });

  test('/● Test suite failed to run/m matches', async () => {
    const { parser, getPlays } = createParser();
    await feed(parser, 't2', '● Test suite failed to run');
    assert.strictEqual(getPlays(), 1);
    parser.dispose();
  });

  test('/● Test suite failed to run/m does not match random text', async () => {
    const { parser, getPlays } = createParser();
    await feed(parser, 't2', 'suite executed successfully');
    assert.strictEqual(getPlays(), 0);
    parser.dispose();
  });

  test('/\\d+ failing/m matches', async () => {
    const { parser, getPlays } = createParser();
    await feed(parser, 't3', '3 failing');
    assert.strictEqual(getPlays(), 1);
    parser.dispose();
  });

  test('/\\d+ failing/m does not match passing summary', async () => {
    const { parser, getPlays } = createParser();
    await feed(parser, 't3', '3 passing');
    assert.strictEqual(getPlays(), 0);
    parser.dispose();
  });

  test('/FAILED/m matches', async () => {
    const { parser, getPlays } = createParser();
    await feed(parser, 't4', 'FAILED test_main.py::test_add');
    assert.strictEqual(getPlays(), 1);
    parser.dispose();
  });

  test('/FAILED/m does not match lowercase failed', async () => {
    const { parser, getPlays } = createParser();
    await feed(parser, 't4', 'failed test_main.py::test_add');
    assert.strictEqual(getPlays(), 0);
    parser.dispose();
  });

  test('/^--- FAIL/m matches', async () => {
    const { parser, getPlays } = createParser();
    await feed(parser, 't5', '--- FAIL: TestAdd (0.00s)');
    assert.strictEqual(getPlays(), 1);
    parser.dispose();
  });

  test('/^--- FAIL/m does not match PASS line', async () => {
    const { parser, getPlays } = createParser();
    await feed(parser, 't5', '--- PASS: TestAdd (0.00s)');
    assert.strictEqual(getPlays(), 0);
    parser.dispose();
  });

  test('/Tests\\s+\\d+\\s+failed/m matches', async () => {
    const { parser, getPlays } = createParser();
    await feed(parser, 't6', 'Tests  2 failed | 8 passed');
    assert.strictEqual(getPlays(), 1);
    parser.dispose();
  });

  test('/Tests\\s+\\d+\\s+failed/m does not match all passed', async () => {
    const { parser, getPlays } = createParser();
    await feed(parser, 't6', 'Tests  8 passed');
    assert.strictEqual(getPlays(), 0);
    parser.dispose();
  });

  test('/AssertionError/m matches', async () => {
    const { parser, getPlays } = createParser();
    await feed(parser, 't7', 'AssertionError: expected 1 to equal 2');
    assert.strictEqual(getPlays(), 1);
    parser.dispose();
  });

  test('/AssertionError/m does not match generic Error', async () => {
    const { parser, getPlays } = createParser();
    await feed(parser, 't7', 'Error: expected 1 to equal 2');
    assert.strictEqual(getPlays(), 0);
    parser.dispose();
  });

  test('buffer trimming keeps only last 512 characters', async () => {
    const { parser } = createParser();
    const id = 'trim-terminal';
    const longData = 'a'.repeat(600);
    await feed(parser, id, longData);
    const buf = parser.buffers.get(id);
    assert.ok(buf);
    assert.strictEqual(buf.length, 512);
    assert.strictEqual(buf, 'a'.repeat(512));
    parser.dispose();
  });
});
