/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { ConsoleLogger, AbstractLogger } from "../util/Logger";

export interface LogProperties {
  [key: string]: any;
}

export interface Logger {
  log(level: string, props: LogProperties, format: string, ...param: any[]);
  trace(props: LogProperties, format: string, ...param: any[]);
  debug(props: LogProperties, format: string, ...param: any[]);
  info(props: LogProperties, format: string, ...param: any[]);
  warn(props: LogProperties, format: string, ...param: any[]);
  error(props: LogProperties, format: string, ...param: any[]);
  fatal(props: LogProperties, format: string, ...param: any[]);
}

let currentLogger = new ConsoleLogger();
export class GlobalLogger extends AbstractLogger {
  log(level: string, props: LogProperties, format: string, ...param: any[]) {
    return currentLogger.log(level, props, format, ...param);
  }
}

const globalLogger = new GlobalLogger();
export function setGlobalLogger(newLogger: Logger) {
  currentLogger = newLogger;
}
export function getGlobalLogger() {
  return globalLogger;
}
