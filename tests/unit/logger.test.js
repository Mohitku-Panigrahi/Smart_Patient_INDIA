const Logger = require('../../js/engine/logger.js');

describe('Logger Utility — Observability & Error Logging', () => {
  let mockStorage = {};

  beforeAll(() => {
    global.localStorage = {
      getItem: jest.fn((key) => mockStorage[key] || null),
      setItem: jest.fn((key, value) => {
        mockStorage[key] = String(value);
      }),
      removeItem: jest.fn((key) => {
        delete mockStorage[key];
      }),
      clear: jest.fn(() => {
        mockStorage = {};
      })
    };
  });

  beforeEach(() => {
    mockStorage = {};
    jest.clearAllMocks();
  });

  afterAll(() => {
    delete global.localStorage;
  });

  test('should create formatted log entries with ISO timestamps', () => {
    const entry = Logger.info('App initialized successfully', { user: 'guest' });
    expect(entry).toHaveProperty('timestamp');
    expect(entry.level).toBe('INFO');
    expect(entry.msg).toBe('App initialized successfully');
    expect(entry.data).toEqual({ user: 'guest' });
  });

  test('should support warn and error log levels', () => {
    const warn = Logger.warn('High latency detected');
    expect(warn.level).toBe('WARN');

    const err = Logger.error('Calculation failure', { code: 500 });
    expect(err.level).toBe('ERROR');
    expect(err.data.code).toBe(500);
  });

  test('should buffer logs in localStorage and retrieve via getLogs()', () => {
    Logger.info('Event 1');
    Logger.warn('Event 2');
    const logs = Logger.getLogs();
    expect(logs.length).toBe(2);
    expect(logs[0].msg).toBe('Event 1');
    expect(logs[1].msg).toBe('Event 2');
  });

  test('should clear stored log buffer via clearLogs()', () => {
    Logger.info('Event to clear');
    expect(Logger.getLogs().length).toBe(1);
    Logger.clearLogs();
    expect(Logger.getLogs().length).toBe(0);
  });

  test('should trim oldest logs when buffer exceeds MAX_LOGS (100)', () => {
    for (let i = 0; i < 105; i++) {
      Logger.info(`Log index ${i}`);
    }
    const logs = Logger.getLogs();
    expect(logs.length).toBe(100);
    expect(logs[0].msg).toBe('Log index 5');
    expect(logs[99].msg).toBe('Log index 104');
  });

  test('should handle circular or non-serializable metadata in sanitizeData', () => {
    const circular = {};
    circular.self = circular;
    const entry = Logger.info('Circular data test', circular);
    expect(entry.data).toBe('[object Object]');
  });
});
