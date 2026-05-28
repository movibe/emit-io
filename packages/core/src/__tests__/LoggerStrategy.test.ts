import { test, expect, vi, beforeEach, afterEach, describe } from 'vitest'
import { LoggerStrategy, LogLevelEnum } from '../index';
import type { LoggerStrategyType, User, BeginCheckoutEvent, PurchaseLogEvent, EVENT_TAGS, Transport, Plugin, AnalyticsProvider } from '../types';

class MockLoggerStrategy implements LoggerStrategyType<
  string,
  string,
  User,
  BeginCheckoutEvent,
  PurchaseLogEvent,
  EVENT_TAGS
> {
  init = vi.fn();
  log = vi.fn();
  event = vi.fn();
  network = vi.fn();
  info = vi.fn();
  error = vi.fn();
  reset = vi.fn();
  logScreen = vi.fn();
  setUserId = vi.fn();
  setUserProperty = vi.fn();
  setUser = vi.fn();
  setUserProperties = vi.fn();
  logBeginCheckout = vi.fn();
  logPaymentSuccess = vi.fn();
  flush = vi.fn();
  getId = vi.fn(() => 'mock-strategy');

  clearMocks() {
    this.init.mockClear();
    this.log.mockClear();
    this.event.mockClear();
    this.network.mockClear();
    this.info.mockClear();
    this.error.mockClear();
    this.reset.mockClear();
    this.logScreen.mockClear();
    this.setUserId.mockClear();
    this.setUserProperty.mockClear();
    this.setUser.mockClear();
    this.setUserProperties.mockClear();
    this.logBeginCheckout.mockClear();
    this.logPaymentSuccess.mockClear();
    this.flush.mockClear();
    this.getId.mockClear();
  }
}

describe('LoggerStrategy — Legacy API (backward compat)', () => {
  let mockStrategy: MockLoggerStrategy;
  let logger: LoggerStrategy;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockStrategy = new MockLoggerStrategy();
    logger = new LoggerStrategy([
      { class: mockStrategy, enabled: true }
    ]);
  });

  afterEach(() => {
    mockStrategy.clearMocks();
    warnSpy.mockRestore();
  });

  test('should initialize correctly', () => {
    logger.init();
    expect(mockStrategy.init).toHaveBeenCalled();
  });

  test('should get strategy by id', () => {
    expect(logger.getStrategy('mock-strategy')).toBeDefined();
  });

  test('should check if strategy exists', () => {
    expect(logger.hasStrategy('mock-strategy')).toBe(true);
    expect(logger.hasStrategy('non-existent')).toBe(false);
  });

  test('should log events', () => {
    const properties = { test: 'value' };
    logger.log('app_start', properties);
    expect(mockStrategy.log).toHaveBeenCalledWith('app_start', properties);
  });

  test('should handle custom events with typed properties', () => {
    const loginEvent: EVENT_TAGS['user-login'] = { method: 'email' };
    logger.event('user-login', loginEvent);
    expect(mockStrategy.event).toHaveBeenCalledWith('user-login', loginEvent);
  });

  test('should handle events without properties', () => {
    logger.event('app-open', {});
    expect(mockStrategy.event).toHaveBeenCalledWith('app-open', {});
  });

  test('should handle network events', () => {
    const properties = { url: 'test.com' };
    logger.network('RestApi_request', properties);
    expect(mockStrategy.network).toHaveBeenCalledWith('RestApi_request', properties);
  });

  test('should handle errors via captureError', () => {
    const error = new Error('Test error');
    const extra = { context: 'test' };
    logger.captureError('TestFeature', 'TestError', true, error, extra);
    expect(mockStrategy.error).toHaveBeenCalledWith('TestFeature', 'TestError', true, error, extra);
  });

  test('should handle user properties', () => {
    const user: User = { id: 'test-user', name: 'Test User' };
    logger.setUser(user);
    expect(mockStrategy.setUser).toHaveBeenCalledWith(user);
  });

  test('should validate user id when setting user', () => {
    const invalidUser = { name: 'Test User' } as User;
    logger.setUser(invalidUser);
    expect(mockStrategy.error).toHaveBeenCalled();
    expect(mockStrategy.setUser).not.toHaveBeenCalled();
  });

  test('should handle begin checkout', () => {
    const checkoutData: BeginCheckoutEvent = {
      currency: 'USD',
      value: 100
    };
    logger.logBeginCheckout('checkout-1', checkoutData);
    expect(mockStrategy.logBeginCheckout).toHaveBeenCalledWith('checkout-1', checkoutData);
  });

  test('should validate checkout id', () => {
    const checkoutData: BeginCheckoutEvent = {
      currency: 'USD',
      value: 100
    };
    logger.logBeginCheckout('', checkoutData);
    expect(mockStrategy.error).toHaveBeenCalled();
    expect(mockStrategy.logBeginCheckout).not.toHaveBeenCalled();
  });

  test('should handle payment success', () => {
    const paymentData: PurchaseLogEvent = {
      type: 'credit_card',
      currency: 'USD',
      value: 100
    };
    logger.logPaymentSuccess('checkout-1', paymentData);
    expect(mockStrategy.logPaymentSuccess).toHaveBeenCalledWith('checkout-1', paymentData);
  });

  test('should validate payment data', () => {
    const invalidPaymentData = { currency: 'USD' } as PurchaseLogEvent;
    logger.logPaymentSuccess('checkout-1', invalidPaymentData);
    expect(mockStrategy.error).toHaveBeenCalled();
    expect(mockStrategy.logPaymentSuccess).not.toHaveBeenCalled();
  });

  test('should handle screen logging', () => {
    const params = { id: 'test' };
    logger.logScreen('TestScreen', params);
    expect(mockStrategy.logScreen).toHaveBeenCalledWith('TestScreen', params);
  });

  test('should handle flush', () => {
    logger.flush();
    expect(mockStrategy.flush).toHaveBeenCalled();
  });

  test('should handle logFeature method', () => {
    const feature = 'TestFeature';
    const name = 'TestInfo';
    const properties = { test: 'value' };
    logger.logFeature(feature, name, properties);
    expect(mockStrategy.info).toHaveBeenCalledWith(feature, name, properties);
  });

  test('should handle setUserProperties with empty object', () => {
    logger.setUserProperties({});
    expect(mockStrategy.setUserProperties).not.toHaveBeenCalled();
  });

  test('should handle setUserProperties with valid properties', () => {
    const properties = { test: 'value' };
    logger.setUserProperties(properties);
    expect(mockStrategy.setUserProperties).toHaveBeenCalledWith(properties);
  });

  test('should handle setUserProperty', () => {
    const name = 'testProp';
    const value = { test: 'value' };
    logger.setUserProperty(name, value);
    expect(mockStrategy.setUserProperty).toHaveBeenCalledWith(name, value);
  });

  test('should handle reset', () => {
    logger.reset();
    expect(mockStrategy.reset).toHaveBeenCalled();
  });

  test('should handle setUserId', () => {
    const userId = 'test-123';
    logger.setUserId(userId);
    expect(mockStrategy.setUserId).toHaveBeenCalledWith(userId);
  });

  test('should handle multiple strategies', () => {
    const mockStrategy2 = new MockLoggerStrategy();
    const logger2 = new LoggerStrategy([
      { class: mockStrategy, enabled: true },
      { class: mockStrategy2, enabled: true }
    ]);

    const event = 'app_start';
    const properties = { test: 'value' };
    logger2.log(event, properties);

    expect(mockStrategy.log).toHaveBeenCalledWith(event, properties);
    expect(mockStrategy2.log).toHaveBeenCalledWith(event, properties);
  });

  test('should handle disabled strategies', () => {
    const mockStrategy2 = new MockLoggerStrategy();
    const logger2 = new LoggerStrategy([
      { class: mockStrategy, enabled: true },
      { class: mockStrategy2, enabled: false }
    ]);

    const event = 'app_start';
    const properties = { test: 'value' };
    logger2.log(event, properties);

    expect(mockStrategy.log).toHaveBeenCalledWith(event, properties);
    expect(mockStrategy2.log).not.toHaveBeenCalled();
  });

  test('should handle error in strategy execution via console.error fallback', () => {
    const errorMock = new Error('Strategy error');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockStrategy.log.mockImplementation(() => {
      throw errorMock;
    });

    logger.log('app_start');
    expect(consoleSpy).toHaveBeenCalled();
    expect(mockStrategy.error).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('LoggerStrategy — v2 API (Transports, Plugins, LogLevel)', () => {
  test('should emit log entries to transports', () => {
    const transportLog = vi.fn();
    const transport: Transport = {
      name: 'test-transport',
      minLevel: LogLevelEnum.INFO,
      log: transportLog,
    };

    const logger = new LoggerStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
    });

    logger.info('test message', { key: 'value' });
    expect(transportLog).toHaveBeenCalledTimes(1);

    const entry = transportLog.mock.calls[0][0];
    expect(entry.message).toBe('test message');
    expect(entry.level).toBe(LogLevelEnum.INFO);
    expect(entry.context?.key).toBe('value');
    expect(entry.timestamp).toBeInstanceOf(Date);
  });

  test('should filter by minLevel', () => {
    const transportLog = vi.fn();
    const transport: Transport = {
      name: 'test',
      minLevel: LogLevelEnum.WARN,
      log: transportLog,
    };

    const logger = new LoggerStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
    });

    logger.debug('should not appear');
    expect(transportLog).not.toHaveBeenCalled();

    logger.warn('should appear');
    expect(transportLog).toHaveBeenCalledTimes(1);
  });

  test('should run plugin pipeline', () => {
    const transportLog = vi.fn();
    const addEnv: Plugin = (entry) => ({
      ...entry,
      context: { ...entry.context, env: 'test' },
    });

    const transport: Transport = {
      name: 'test',
      minLevel: LogLevelEnum.DEBUG,
      log: transportLog,
    };

    const logger = new LoggerStrategy({
      transports: [transport],
      plugins: [addEnv],
      emitAppOpenOnInit: false,
    });

    logger.info('test');
    const entry = transportLog.mock.calls[0][0];
    expect(entry.context?.env).toBe('test');
  });

  test('should drop entries when plugin returns null', () => {
    const transportLog = vi.fn();
    const dropAll: Plugin = () => null;

    const transport: Transport = {
      name: 'test',
      minLevel: LogLevelEnum.DEBUG,
      log: transportLog,
    };

    const logger = new LoggerStrategy({
      transports: [transport],
      plugins: [dropAll],
      emitAppOpenOnInit: false,
    });

    logger.info('test');
    expect(transportLog).not.toHaveBeenCalled();
  });

  test('should chain multiple plugins in order', () => {
    const transportLog = vi.fn();
    const addA: Plugin = (e) => ({ ...e, context: { ...e.context, a: 1 } });
    const addB: Plugin = (e) => ({ ...e, context: { ...e.context, b: 2 } });

    const transport: Transport = {
      name: 'test',
      minLevel: LogLevelEnum.DEBUG,
      log: transportLog,
    };

    const logger = new LoggerStrategy({
      transports: [transport],
      plugins: [addA, addB],
      emitAppOpenOnInit: false,
    });

    logger.info('test');
    const entry = transportLog.mock.calls[0][0];
    expect(entry.context?.a).toBe(1);
    expect(entry.context?.b).toBe(2);
  });

  test('debug, warn, fatal methods', () => {
    const transportLog = vi.fn();
    const transport: Transport = {
      name: 'test',
      minLevel: LogLevelEnum.DEBUG,
      log: transportLog,
    };

    const logger = new LoggerStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
    });

    logger.debug('debug msg');
    logger.warn('warn msg');
    logger.fatal('fatal msg');

    expect(transportLog).toHaveBeenCalledTimes(3);
    expect(transportLog.mock.calls[0][0].level).toBe(LogLevelEnum.DEBUG);
    expect(transportLog.mock.calls[1][0].level).toBe(LogLevelEnum.WARN);
    expect(transportLog.mock.calls[2][0].level).toBe(LogLevelEnum.FATAL);
  });

  test('error overload: LogLevel call', () => {
    const transportLog = vi.fn();
    const transport: Transport = {
      name: 'test',
      minLevel: LogLevelEnum.DEBUG,
      log: transportLog,
    };

    const logger = new LoggerStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
    });

    logger.error('something went wrong', { code: 500 });
    expect(transportLog).toHaveBeenCalledTimes(1);
    const entry = transportLog.mock.calls[0][0];
    expect(entry.message).toBe('something went wrong');
    expect(entry.level).toBe(LogLevelEnum.ERROR);
  });

  test('captureError: dispatches to analytics provider', () => {
    const providerError = vi.fn();
    const provider: AnalyticsProvider = {
      name: 'test-provider',
      enabled: true,
      error: providerError,
    };

    const logger = new LoggerStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
    });

    const err = new Error('test');
    logger.captureError('Feature', 'fail', true, err, { extra: 1 });
    expect(providerError).toHaveBeenCalledWith('Feature', 'fail', true, err, { extra: 1 });
  });

  test('should add provider after construction', () => {
    const providerEvent = vi.fn();
    const provider: AnalyticsProvider = {
      name: 'dynamic',
      enabled: true,
      event: providerEvent,
    };

    const logger = new LoggerStrategy({ emitAppOpenOnInit: false });
    logger.addProvider(provider);
    logger.event('test-event');
    expect(providerEvent).toHaveBeenCalledWith('test-event', undefined);
  });

  test('should add plugin after construction', () => {
    const transportLog = vi.fn();
    const transport: Transport = {
      name: 'test',
      minLevel: LogLevelEnum.DEBUG,
      log: transportLog,
    };

    const logger = new LoggerStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
    });

    const addTag: Plugin = (e) => ({ ...e, context: { ...e.context, added: true } });
    logger.addPlugin(addTag);

    logger.info('after plugin');
    expect(transportLog.mock.calls[0][0].context?.added).toBe(true);
  });

  test('should add transport after construction', () => {
    const transportLog = vi.fn();
    const transport: Transport = {
      name: 'late',
      minLevel: LogLevelEnum.DEBUG,
      log: transportLog,
    };

    const logger = new LoggerStrategy({ emitAppOpenOnInit: false });
    logger.addTransport(transport);
    logger.info('hello');
    expect(transportLog).toHaveBeenCalled();
  });

  test('should not emit app-open when emitAppOpenOnInit is false', () => {
    const transportLog = vi.fn();
    const transport: Transport = {
      name: 'test',
      minLevel: LogLevelEnum.DEBUG,
      log: transportLog,
    };

    const providerEvent = vi.fn();
    const provider: AnalyticsProvider = {
      name: 'p',
      enabled: true,
      event: providerEvent,
    };

    const logger = new LoggerStrategy({
      providers: [provider],
      transports: [transport],
      emitAppOpenOnInit: false,
    });

    logger.init();
    expect(providerEvent).not.toHaveBeenCalled();
  });

  test('should flush transports', () => {
    const transportFlush = vi.fn();
    const transport: Transport = {
      name: 'test',
      minLevel: LogLevelEnum.DEBUG,
      log: vi.fn(),
      flush: transportFlush,
    };

    const logger = new LoggerStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
    });

    logger.flush();
    expect(transportFlush).toHaveBeenCalled();
  });

  test('should handle error in provider and not crash via console.error fallback', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const provider: AnalyticsProvider = {
      name: 'broken',
      enabled: true,
      event: () => { throw new Error('fail'); },
    };

    const logger = new LoggerStrategy({
      providers: [provider],
      emitAppOpenOnInit: false,
    });

    expect(() => logger.event('test-event')).not.toThrow();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('transport enabled: false — log() never called', () => {
    const transportLog = vi.fn()
    const transport: Transport = {
      name: 'disabled',
      minLevel: LogLevelEnum.DEBUG,
      enabled: false,
      log: transportLog,
    }

    const logger = new LoggerStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
    })

    logger.info('should not arrive')
    expect(transportLog).not.toHaveBeenCalled()
  })

  test('transport enabled: undefined (default) — log() called', () => {
    const transportLog = vi.fn()
    const transport: Transport = {
      name: 'default-enabled',
      minLevel: LogLevelEnum.DEBUG,
      log: transportLog,
    }

    const logger = new LoggerStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
    })

    logger.info('should arrive')
    expect(transportLog).toHaveBeenCalledTimes(1)
  })

  test('runtime toggle enabled = false stops delivery', () => {
    const transportLog = vi.fn()
    const transport: Transport = {
      name: 'toggle',
      minLevel: LogLevelEnum.DEBUG,
      enabled: true,
      log: transportLog,
    }

    const logger = new LoggerStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
    })

    logger.info('first')
    expect(transportLog).toHaveBeenCalledTimes(1)

    transport.enabled = false
    logger.info('second')
    expect(transportLog).toHaveBeenCalledTimes(1)
  })

  test('runtime toggle enabled = true resumes delivery', () => {
    const transportLog = vi.fn()
    const transport: Transport = {
      name: 'toggle',
      minLevel: LogLevelEnum.DEBUG,
      enabled: false,
      log: transportLog,
    }

    const logger = new LoggerStrategy({
      transports: [transport],
      emitAppOpenOnInit: false,
    })

    logger.info('first')
    expect(transportLog).not.toHaveBeenCalled()

    transport.enabled = true
    logger.info('second')
    expect(transportLog).toHaveBeenCalledTimes(1)
  })

  test('mixed transports: enabled + disabled', () => {
    const logA = vi.fn()
    const logB = vi.fn()
    const t1: Transport = { name: 'a', minLevel: LogLevelEnum.DEBUG, enabled: true, log: logA }
    const t2: Transport = { name: 'b', minLevel: LogLevelEnum.DEBUG, enabled: false, log: logB }

    const logger = new LoggerStrategy({
      transports: [t1, t2],
      emitAppOpenOnInit: false,
    })

    logger.info('mixed')
    expect(logA).toHaveBeenCalledTimes(1)
    expect(logB).not.toHaveBeenCalled()
  })
});
