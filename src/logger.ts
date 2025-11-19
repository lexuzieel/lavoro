import type {
  Logger as InternalLogger,
  Levels,
  LogObject,
} from '@julr/utils/logger'
import pino from 'pino'

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
  return new Logger(pino({ name, level }))
}
