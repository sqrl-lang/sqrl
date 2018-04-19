/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import * as util from "util";
import { LogProperties, Logger } from "../api/log";

export abstract class AbstractLogger implements Logger {
  abstract log(
    level: string,
    props: LogProperties,
    format: string,
    ...param: any[]
  );

  trace(props: LogProperties, format: string, ...param: any[]) {
    return this.log("trace", props, format, ...param);
  }
  debug(props: LogProperties, format: string, ...param: any[]) {
    return this.log("debug", props, format, ...param);
  }
  info(props: LogProperties, format: string, ...param: any[]) {
    return this.log("info", props, format, ...param);
  }
  warn(props: LogProperties, format: string, ...param: any[]) {
    return this.log("warn", props, format, ...param);
  }
  error(props: LogProperties, format: string, ...param: any[]) {
    return this.log("error", props, format, ...param);
  }
  fatal(props: LogProperties, format: string, ...param: any[]) {
    return this.log("fatal", props, format, ...param);
  }
}

export class ConsoleLogger extends AbstractLogger {
  log(level: string, props: LogProperties, format: string, ...param: any[]) {
    const message = util.format(format, ...param);
    // tslint:disable-next-line
    console.error(message);
    if (props.err && props.err.stack) {
      // tslint:disable-next-line
      console.error(props.err.stack);
    }
  }
}
