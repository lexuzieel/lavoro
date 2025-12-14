import type {
  Logger as InternalLogger,
  Levels,
  LogObject,
} from '@julr/utils/logger'

/**
 * No-op logger implementation used as fallback when pino is not installed
 */
class NoOpLogger implements InternalLogger {
  level: Levels = 'trace'

  child(_obj: LogObject): InternalLogger {
    return this
  }

  trace(_msg: any, _obj?: any): void {}
  debug(_msg: any, _obj?: any): void {}
  info(_msg: any, _obj?: any): void {}
  warn(_msg: any, _obj?: any): void {}
  error(_msg: any, _obj?: any): void {}
  fatal(_msg: any, _obj?: any): void {}
}

export class Logger {
  private internalLogger: InternalLogger

  constructor(internalLogger: InternalLogger) {
    this.internalLogger = internalLogger
  }

  child(obj: LogObject) {
    return new Logger(this.internalLogger.child(obj))
  }

  trace(msg: any, obj?: any) {
    this.internalLogger.trace(msg, obj)
  }

  debug(msg: any, obj?: any) {
    this.internalLogger.debug(msg, obj)
  }

  warn(msg: any, obj?: any) {
    this.internalLogger.warn(msg, obj)
  }

  error(msg: any, obj?: any) {
    this.internalLogger.error(msg, obj)
  }

  fatal(msg: any, obj?: any) {
    this.internalLogger.fatal(msg, obj)
  }

  info(msg: any, obj?: any) {
    this.internalLogger.info(msg, obj)
  }
}

export function createDefaultLogger(
  name: string,
  level: Levels = 'info',
): Logger {
  try {
    // Try to require pino synchronously
    const pino = require('pino')
    return new Logger(pino({ name, level }))
  } catch {
    // Fallback to no-op logger if pino is not installed
    return new Logger(new NoOpLogger())
  }
}
