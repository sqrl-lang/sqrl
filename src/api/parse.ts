/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { LogProperties } from "./log";
import { Filesystem } from "./filesystem";
import { SqrlParserState } from "../compile/SqrlParserState";
import { AstLocation } from "./ast";
import { Ast } from "../ast/Ast";

import util = require("util");
import { sqrlSourceArrow } from "../compile/sqrlSourceArrow";
import invariant from "../jslib/invariant";

/**
 * Return a SqrlCompileError that can be thrown. This function helps us work
 * around a typescript defeciency where sqrlInvariant does not mark the
 * condition as invalid in sqrlInvariant().
 *
 * See https://github.com/Microsoft/TypeScript/issues/8655
 */
export function buildSqrlError(
  node: Ast,
  format: string,
  ...args: any[]
): SqrlAstError {
  return new SqrlAstError(util.format(format, ...args), node.location || null);
}

export function sqrlInvariant(
  node: Ast,
  condition,
  format: string,
  ...args: Array<any>
) {
  invariant(
    typeof node === "object" && typeof node.type === "string",
    `Expected an ast as the first argument. Got value of type ${typeof node}.`
  );

  if (condition) {
    return;
  }
  throw new SqrlAstError(util.format(format, ...args), node.location || null);
}

/**
 * A SQRL CompileState represents the state of the SQRL compiler during a single
 * compilation.
 */
export class CompileState {
  /**
   * @hidden
   */
  constructor(
    /**
     * @hidden
     */
    public _wrapped: SqrlParserState
  ) {}

  /**
   * Returns the filesystem linked for files associated in this compile
   */
  getFilesystem(): Filesystem {
    return this._wrapped.filesystem;
  }

  /**
   * Logs a message at the trace (lowest) level
   */
  trace(props: LogProperties, format: string, ...param: any[]) {
    return this._wrapped.trace(props, format, ...param);
  }

  /**
   * Logs a message at the debug (second lowest) level
   */
  debug(props: LogProperties, format: string, ...param: any[]) {
    return this._wrapped.debug(props, format, ...param);
  }

  /**
   * Logs a message at the info (normal) level
   */
  info(props: LogProperties, format: string, ...param: any[]) {
    return this._wrapped.info(props, format, ...param);
  }

  /**
   * Logs a message at the warn (priority) level
   */
  warn(props: LogProperties, format: string, ...param: any[]) {
    return this._wrapped.warn(props, format, ...param);
  }

  /**
   * Logs a message at the error (high priority) level
   */
  error(props: LogProperties, format: string, ...param: any[]) {
    return this._wrapped.error(props, format, ...param);
  }

  /**
   * Logs a message at the fatal (highest priority) level
   */
  fatal(props: LogProperties, format: string, ...param: any[]) {
    return this._wrapped.fatal(props, format, ...param);
  }
}

export interface SqrlParseErrorOptions {
  location?: AstLocation;
  source?: string;
  files?: { [filename: string]: string };
}

export interface SqrlErrorOutputOptions {
  codedError: boolean;
  source?: boolean;
  stacktrace?: boolean;
}

function getPositionString(location: AstLocation): string {
  const { start, end, filename } = location;

  let position: string;
  if (start.line === end.line) {
    position = `line ${start.line}`;
  } else {
    position = `lines ${start.line}-${end.line}`;
  }

  if (filename) {
    position += ` of ${filename}`;
  }
  return position;
}

/**
 * Represents an error that occurred during a SQRL compilation
 */
export abstract class SqrlCompileError extends Error {
  abstract toSqrlErrorOutput(options: SqrlErrorOutputOptions): string;
  abstract update(options: SqrlParseErrorOptions);

  toString() {
    return this.toSqrlErrorOutput({ codedError: false, source: false });
  }
}

export class SqrlLocationError extends SqrlCompileError {
  constructor(message: string, private location: AstLocation) {
    super(message);
  }
  toSqrlErrorOutput(options: SqrlErrorOutputOptions): string {
    if (this.location) {
      return `Error on ${getPositionString(this.location)}: ${this.message}`;
    }
    return this.message;
  }
  update(options: SqrlParseErrorOptions) {
    /* do nothing */
  }
}

export class SqrlAstError extends SqrlCompileError {
  constructor(
    message: string,
    public location: AstLocation | null = null,
    public source: string | null = null
  ) {
    super(message);
    this.source = source;
    this.location = location;
  }

  toSqrlErrorOutput(options: SqrlErrorOutputOptions): string {
    let message = this.message;

    if (!options.codedError && options.stacktrace && this.stack) {
      message = this.stack;
    }

    if (this.location) {
      message = `Error on ${getPositionString(this.location)}: ${message}`;
      if (this.location.source) {
        message += "\n" + sqrlSourceArrow(this.location);
      }
    }

    return message;
  }

  update(options: SqrlParseErrorOptions) {
    this.location = this.location || options.location || null;
    this.source = this.source || options.source || null;
  }
}
