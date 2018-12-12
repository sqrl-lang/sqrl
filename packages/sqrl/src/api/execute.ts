/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlExecutionState } from "../execute/SqrlExecutionState";

import { SqrlExecutable } from "../execute/SqrlExecutable";
import { executableFromString as _executableFromString } from "../helpers/CompileHelpers";
import { default as _FunctionRegistry } from "../function/FunctionRegistry";
import { Context } from "./ctx";
import { Ast } from "../ast/Ast";
import invariant from "../jslib/invariant";
import { LogProperties } from "./log";
import { CompileState } from "./parse";
import { buildFunctionRegistryFromAddresses } from "../helpers/FunctionRegistryHelpers";

export interface ExecutableOptions {
  functionRegistry: FunctionRegistry;
}

export interface FeatureMap {
  [feature: string]: any;
}

/**
 * Build a function registry with the default functions included.
 */
export function buildFunctionRegistry() {
  return new FunctionRegistry(buildFunctionRegistryFromAddresses({}));
}

/**
 * This method creates an SQRL Executable given source code and a function
 * registry.
 */
export function executableFromString(
  sqrl: string,
  options: ExecutableOptions
): Promise<Executable> {
  return _executableFromString(sqrl, {
    ...options,
    functionRegistry: options.functionRegistry._wrapped
  }).then(_executable => new Executable(_executable));
}

/**
 * The function registry collects all of the functions and transforms available
 * to the SQRL compiler and runtime.
 */
export class FunctionRegistry {
  /**
   * @hidden
   */
  constructor(
    /**
     * @hidden
     */
    public _wrapped: _FunctionRegistry
  ) {}

  register(func: (...args: any) => Promise<any>) {
    this._wrapped.save(func, {
      async: true
    });
  }

  registerSync(func: (...args: any) => any) {
    this._wrapped.save(func);
  }

  registerTransform(transform: (state: CompileState, ast: Ast) => Ast) {
    invariant(
      transform.name,
      "registerTransform() must be called with a named function"
    );
    return this._wrapped.save(null, {
      name: transform.name,
      transformAst: (state, ast) => {
        return transform(new CompileState(state), ast);
      }
    });
  }
}

/**
 * A SQRL Executable is the compiled verison of SQRL source files. It can be
 * cheaply executed for new events.
 */
export class Executable {
  constructor(
    /**
     * @internal
     */
    public _wrapped: SqrlExecutable
  ) {}

  async execute(ctx: Context): Promise<Execution> {
    return new Execution(await this._wrapped.startExecution(ctx));
  }
}

/**
 * A SQRL Execution is the runtime representation of a single event executing
 * in the SQRL runtime.
 */
export class Execution {
  /**
   * @hidden
   */
  constructor(
    /**
     * @hidden
     */
    public _wrapped: SqrlExecutionState
  ) {}

  /**
   * Returns a promise for the given feature name for the execution. If the
   * feature has not been calculated yet this will start the calculation.
   */
  fetchFeature(featureName: string): Promise<any> {
    return Promise.resolve(this._wrapped.fetchBasicByName(featureName));
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
