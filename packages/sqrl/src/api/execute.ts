/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { SqrlExecutable } from "../execute/SqrlExecutable";
import { SqrlFunctionRegistry as _FunctionRegistry } from "../function/FunctionRegistry";
import { Context } from "./ctx";
import { Ast, CallAst, CustomCallAst } from "../ast/Ast";
import invariant from "../jslib/invariant";
import { LogProperties } from "./log";
import { CompileState } from "./parse";
import { buildFunctionRegistryForServices } from "../helpers/FunctionRegistryHelpers";
import { ArgumentCheck } from "./arg";
import { SourcePrinter } from "./executable";
import { FunctionServices } from "../function/registerAllFunctions";
import { SqrlObject } from "sqrl-common";
import { SqrlKey } from "./object";
import { isValidFeatureName } from "../feature/FeatureName";

export const STANDARD_LIBRARY = "sqrl";

export interface ExecutionErrorProperties {
  functionName?: string;
  fatal?: boolean;
}

export type ManipulatorCallback = (ctx: Context) => Promise<void>;

export abstract class Manipulator {
  constructor() {
    /* do nothing */
  }
  public codedWarnings: string[];
  public codedErrors: string[];

  abstract getCurrentHumanOutput(): any;
  abstract addCallback(cb: ManipulatorCallback);
  abstract mutate(ctx: Context): Promise<void>;
  abstract logError(err: Error, props: ExecutionErrorProperties): void;
  abstract throwFirstError(): void;

  trackSqrlKey(key: SqrlKey): void {
    /* optional function, do nothing by default */
  }
}

export interface ExecutableOptions {
  functionRegistry: FunctionRegistry;
}

export interface FeatureMap {
  [feature: string]: any;
}

export interface FunctionInfo {
  name: string;
  argstring: string | null;
  docstring: string | null;
  package: string | null;
}

/**
 * Build a function registry with the default functions included.
 */
export function buildFunctionRegistry(services: FunctionServices = {}) {
  return new FunctionRegistry(buildFunctionRegistryForServices(services));
}

/**
 * Options for registering a new function
 */
export interface MinimalFunctionOptions {
  argstring?: string;
  docstring?: string;
}

export interface FunctionOptions extends MinimalFunctionOptions {
  args?: ArgumentCheck[];
}

export interface ImplementedFunctionOptions extends FunctionOptions {
  allowNull?: boolean;
  allowSqrlObjects?: boolean;
  pure?: boolean;
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
    public _wrapped: _FunctionRegistry,
    /**
     * @hidden
     */
    private pkg: string = null
  ) {}

  createPackageRegistry(name: string) {
    invariant(
      this.pkg === null,
      "Function registry is already linked to package: " + this.pkg
    );
    return new FunctionRegistry(this._wrapped, name);
  }

  listFunctions(): FunctionInfo[] {
    return Object.keys(this._wrapped.functionProperties)
      .filter(func => !func.startsWith("_"))
      .map(func => {
        const props = this._wrapped.functionProperties[func];
        return {
          name: func,
          argstring: props.argstring || null,
          docstring: props.docstring || null,
          package: props.package || null
        };
      });
  }

  register(
    func: (state: Execution, ...args: any) => Promise<any>,
    options: ImplementedFunctionOptions = {}
  ) {
    this._wrapped.save(func, {
      async: true,
      allowNull: options.allowNull || false,
      allowSqrlObjects: options.allowSqrlObjects || false,
      pure: options.pure || false,
      args: options.args,
      package: this.pkg,
      argstring: options.argstring,
      docstring: options.docstring
    });
  }

  registerSync(
    func: (...args: any) => any,
    options: ImplementedFunctionOptions = {}
  ) {
    this._wrapped.save(func, {
      allowNull: options.allowNull || false,
      allowSqrlObjects: options.allowSqrlObjects || false,
      pure: options.pure || false,
      args: options.args,
      package: this.pkg,
      argstring: options.argstring,
      docstring: options.docstring
    });
  }

  registerStatement(
    statementFeature: string,
    func: (state: Execution, ...args: any) => Promise<any>,
    options: ImplementedFunctionOptions = {}
  ) {
    this._wrapped.save(func, {
      statementFeature,
      async: true,
      allowNull: options.allowNull || false,
      allowSqrlObjects: options.allowSqrlObjects || false,
      pure: options.pure || false,
      statement: true,
      args: options.args,
      package: this.pkg,
      argstring: options.argstring,
      docstring: options.docstring
    });
  }

  registerCustom(
    transform: (state: CompileState, ast: CustomCallAst) => Ast,
    options: MinimalFunctionOptions = {}
  ) {
    invariant(
      transform.name,
      "registerCustom() must be called with a named function"
    );
    return this._wrapped.save(null, {
      name: transform.name,
      customTransform: (state, ast) => {
        return transform(new CompileState(state), ast);
      },
      package: this.pkg,
      argstring: options.argstring,
      docstring: options.docstring
    });
  }

  registerTransform(
    transform: (state: CompileState, ast: CallAst) => Ast,
    options: FunctionOptions = {}
  ) {
    invariant(
      transform.name,
      "registerTransform() must be called with a named function"
    );
    return this._wrapped.save(null, {
      name: transform.name,
      transformAst: (state, ast) => {
        return transform(new CompileState(state), ast);
      },
      package: this.pkg,
      args: options.args,
      argstring: options.argstring,
      docstring: options.docstring
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

  async execute(
    ctx: Context,
    options: {
      manipulator?: Manipulator;
      inputs?: FeatureMap;
      featureTimeoutMs?: number;
    } = {}
  ): Promise<Execution> {
    return this._wrapped.startExecution(ctx, {
      manipulator: options.manipulator,
      inputs: options.inputs,
      featureTimeoutMs: options.featureTimeoutMs
    });
  }

  /**
   * Get the source code printer for the executable.
   */
  getSourcePrinter(): SourcePrinter {
    return this._wrapped.sourcePrinter;
  }

  /**
   * Get all the slot names that are available
   */
  getFeatures(): string[] {
    return this._wrapped.getNames().filter(name => isValidFeatureName(name));
  }

  /**
   * Get the required features
   */
  getRequiredFeatures(): string[] {
    return this._wrapped.getRequiredSlotNames();
  }
}

/**
 * A SQRL Execution is the runtime representation of a single event executing
 * in the SQRL runtime.
 */
export interface Execution {
  readonly ctx: Context;
  readonly manipulator: Manipulator;

  /**
   * Returns a promise for the given feature name for the execution. If the
   * feature has not been calculated yet this will start the calculation.
   */
  fetchFeature(featureName: string): Promise<SqrlObject>;

  /**
   * Returns a promise for the given feature name for the execution. If the
   * feature has not been calculated yet this will start the calculation.
   */
  fetchValue(featureName: string): Promise<any>;

  /**
   * Get the source code printer for the executable.
   */
  getSourcePrinter(): SourcePrinter;

  /**
   * Returns the current event time in milliseconds
   */
  getClockMs(): number;

  /**
   * Logs a message at the trace (lowest) level
   */
  trace(props: LogProperties, format: string, ...param: any[]);

  /**
   * Logs a message at the debug (second lowest) level
   */
  debug(props: LogProperties, format: string, ...param: any[]);

  /**
   * Logs a message at the info (normal) level
   */
  info(props: LogProperties, format: string, ...param: any[]);

  /**
   * Logs a message at the warn (priority) level
   */
  warn(props: LogProperties, format: string, ...param: any[]);

  /**
   * Logs a message at the error (high priority) level
   */
  error(props: LogProperties, format: string, ...param: any[]);

  /**
   * Logs a message at the fatal (highest priority) level
   */
  fatal(props: LogProperties, format: string, ...param: any[]);
}
