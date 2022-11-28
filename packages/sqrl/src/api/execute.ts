/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { SqrlExecutable } from "../execute/SqrlExecutable";
import { SqrlInstance as _Instance } from "../function/Instance";
import { Context } from "./ctx";
import { Ast, CallAst, CustomCallAst } from "../ast/Ast";
import invariant from "../jslib/invariant";
import { LogProperties } from "./log";
import { CompileState } from "./parse";
import { buildSqrlInstanceForServices } from "../helpers/InstanceHelpers";
import { ArgumentCheck } from "./arg";
import { SourcePrinter } from "./executable";
import { SqrlObject, AssertService } from "sqrl-common";
import { SqrlKey } from "./object";
import { isValidFeatureName } from "../feature/FeatureName";
import { Config } from "./config";

export const STANDARD_LIBRARY = "sqrl";

export interface ExecutionErrorProperties {
  functionName?: string;
  fatal?: boolean;
}

export interface LogService {
  log(manipulator: Manipulator, message: string);
}

export interface FunctionServices {
  assert?: AssertService;
  log?: LogService;
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
  instance: Instance;
}

export type FeatureMap<T extends string = string> = {
  // TODO(meyer) any --> unknown
  [key in T]: any;
};

export interface FunctionInfo {
  name: string;
  argstring: string | null;
  docstring: string | null;
  package: string | null;
}

/**
 * Build an instance with the default functions included.
 */
export function createInstance(
  props: {
    config?: Config;
    services?: FunctionServices;
  } = {}
) {
  return new Instance(
    props.config || {},
    buildSqrlInstanceForServices(props.services || {})
  );
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
 * An instanec represents a collection of functions and configuration for the SQRL compiler and runtime
 */
export class Instance {
  private mergedConfig = null;

  /**
   * @hidden
   */
  constructor(
    private config: Config,
    /**
     * @hidden
     */
    public _instance: _Instance,
    readonly packageName: string = null
  ) {}

  createPackageInstance(name: string) {
    invariant(
      this.packageName === null && this.packageName !== name,
      "Instance is already linked to package: " + this.packageName
    );
    return new Instance(this.config, this._instance, name);
  }

  async importFromPackage(name: string, importedPackage: any) {
    invariant(
      typeof importedPackage.register === "function",
      "Required package did not include a `register` function: " + name
    );
    await importedPackage.register(this.createPackageInstance(name));
  }

  getConfig(): Config {
    if (!this.mergedConfig) {
      if (this.packageName && this.config["[" + this.packageName + "]"]) {
        this.mergedConfig = Object.assign(
          {},
          this.config,
          this.config["[" + this.packageName + "]"]
        );
      } else {
        this.mergedConfig = this.config;
      }
    }
    return this.mergedConfig;
  }

  listFunctions(): FunctionInfo[] {
    return Object.keys(this._instance.functionProperties)
      .filter((func) => !func.startsWith("_"))
      .map((func) => {
        const props = this._instance.functionProperties[func];
        return {
          name: func,
          argstring: props.argstring || null,
          docstring: props.docstring || null,
          package: props.package || null,
        };
      });
  }

  register(
    func: (state: Execution, ...args: any) => Promise<any>,
    options: ImplementedFunctionOptions = {}
  ) {
    this._instance.save(func, {
      async: true,
      allowNull: options.allowNull || false,
      allowSqrlObjects: options.allowSqrlObjects || false,
      pure: options.pure || false,
      args: options.args,
      package: this.packageName,
      argstring: options.argstring,
      docstring: options.docstring,
    });
  }

  registerSync(
    func: (...args: any) => any,
    options: ImplementedFunctionOptions = {}
  ) {
    this._instance.save(func, {
      allowNull: options.allowNull || false,
      allowSqrlObjects: options.allowSqrlObjects || false,
      pure: options.pure || false,
      args: options.args,
      package: this.packageName,
      argstring: options.argstring,
      docstring: options.docstring,
    });
  }

  registerStatement(
    statementFeature: string,
    func: (state: Execution, ...args: any) => Promise<any>,
    options: ImplementedFunctionOptions = {}
  ) {
    this._instance.save(func, {
      statementFeature,
      async: true,
      allowNull: options.allowNull || false,
      allowSqrlObjects: options.allowSqrlObjects || false,
      pure: options.pure || false,
      statement: true,
      args: options.args,
      package: this.packageName,
      argstring: options.argstring,
      docstring: options.docstring,
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
    return this._instance.save(null, {
      name: transform.name,
      customTransform: (state, ast) => {
        return transform(new CompileState(state), ast);
      },
      package: this.packageName,
      argstring: options.argstring,
      docstring: options.docstring,
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
    return this._instance.save(null, {
      name: transform.name,
      transformAst: (state, ast) => {
        return transform(new CompileState(state), ast);
      },
      package: this.packageName,
      args: options.args,
      argstring: options.argstring,
      docstring: options.docstring,
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
      featureTimeoutMs: options.featureTimeoutMs,
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
    return this._wrapped.getNames().filter((name) => isValidFeatureName(name));
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
   * Fetch a value from the executions data cache
   */
  get<T>(symbol: symbol, defaultValue?: T): T;

  /**
   * Fetch a value from the executions data cache
   */
  set<T>(symbol: symbol, value: T): void;

  /**
   * Get a value on the executions data, setting a default value if not set
   */
  setDefault<T>(symbol: symbol, defaultValue?: T): T;

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
