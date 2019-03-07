/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { AstTypes as AT } from "../ast/AstTypes";
import { Ast, CallAst, CustomCallAst } from "../ast/Ast";
import { SqrlObject } from "../object/SqrlObject";

import bluebird = require("bluebird");
import isPromise from "../jslib/isPromise";
import invariant from "../jslib/invariant";
import { sqrlInvariant } from "../api/parse";
import { SqrlParserState } from "../compile/SqrlParserState";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import { nice } from "node-nice";
import hrtimeToNs from "../jslib/hrtimeToNs";
import { getGlobalLogger } from "../api/log";
import { WhenCauseArgument, StateArgument, ArgumentCheck } from "../api/arg";
import { ExecutionErrorProperties, STANDARD_LIBRARY } from "../api/execute";

/**
 * @note: AsyncFunction here is not required but throws errors if a function is
 * defined badly. It is not supported by Babel (hence hasAsyncFunction below)
 */
const AsyncFunction = Object.getPrototypeOf(async function() {
  /* intentional */
}).constructor;
const hasAsyncFunction = AsyncFunction !== Function;

export interface SaveFunctionProperties {
  allowNull?: boolean;
  allowSqrlObjects?: boolean;
  args?: ArgumentCheck[];
  async?: boolean;
  asyncSafe?: boolean;
  customTransform?: (state: SqrlParserState, ast: CustomCallAst) => Ast;
  name?: string;
  promiseArgs?: boolean;
  callbackArgs?: boolean;
  pure?: boolean;
  safe?: boolean;
  statement?: boolean;
  statementFeature?: string;
  transformAst?: (state: SqrlParserState, ast: CallAst) => Ast;
  jsonCache?: boolean;

  lazyArguments?: boolean;

  /* name of the package that provided this function */
  package?: string;

  /* list of arguments the function takes as a string */
  argstring?: string;

  /* single sentence documenting what the function does */
  docstring?: string;

  /* function should not error out, and sqrl request should be retried if it does */
  vital?: boolean;

  /* function should be executed in the background off of the main event loop */
  background?: boolean;
}

export interface FunctionProperties extends SaveFunctionProperties {
  stateArg?: boolean;
  whenCauseArg: boolean;

  /* cost per million executions * intCostMultiplier */
  cost?: number;
}

export interface FunctionCostData {
  [name: string]: number;
}

interface SafetyNetConfig {
  stateArg: boolean;
  vital: boolean;
}
function asyncSafetyNet(
  name: string,
  fn,
  config: SafetyNetConfig
): (state: SqrlExecutionState) => bluebird<any> {
  // @TODO: We see a type error because
  const wrapped: any = bluebird.method(fn);
  const { vital, stateArg } = config;

  const errorProps: ExecutionErrorProperties = { functionName: name };
  if (vital) {
    errorProps.fatal = true;
  }

  invariant(
    stateArg,
    "async function [%s] requires state argument as it is likely to fail due to timeouts",
    name
  );
  return function(state) {
    return wrapped
      .apply(null, arguments)
      .timeout(state.featureTimeout, `Timeout after ${state.featureTimeout}`)
      .catch(err => {
        state.logError(err, errorProps);
        return null;
      });
  };
}

function syncSafetyNet(name: string, fn, config: SafetyNetConfig) {
  const wrapped = fn;
  const { stateArg, vital } = config;
  if (stateArg) {
    const errorProps: ExecutionErrorProperties = { functionName: name };
    if (vital) {
      errorProps.fatal = true;
    }
    return function(state) {
      try {
        const result = wrapped.apply(null, arguments);
        if (isPromise(result)) {
          state.fatal(`Sync sqrl function returned a promise:: ${name}`);
        }
        return result;
      } catch (err) {
        state.logError(err, errorProps);
        return null;
      }
    };
  } else {
    return function() {
      try {
        const result = wrapped.apply(null, arguments);
        if (isPromise(result)) {
          getGlobalLogger().fatal(
            {},
            `Sync sqrl function returned a promise:: ${name}`
          );
        }
        return result;
      } catch (err) {
        // @NOTE: Any sqrl functions that are /expected/ to error should have a state arg
        getGlobalLogger().fatal(
          { err },
          `Error in sqrl function without state ${name}: ${err.toString()}`
        );
        return null;
      }
    };
  }
}

export class StdlibRegistry {
  constructor(public wrapped: SqrlInstance, public packageName: string) {}

  save(
    fn: (...args: any[]) => any | null,
    props: SaveFunctionProperties = {}
  ): void {
    return this.wrapped.save(fn, {
      package: STANDARD_LIBRARY + "." + this.packageName,
      ...props
    });
  }
}

export class SqrlInstance {
  // Use integers for calculation
  static intCostMultiplier = 100000;

  readonly customFunctions: Set<string> = new Set();

  /* functions before any statistics tracking/etc */
  pureFunction: { [name: string]: (...any) => any } = {};

  functions: { [name: string]: (...any) => any };
  functionProperties: { [name: string]: FunctionProperties };
  statementFeatures: Set<string>;
  functionStats: null | {
    [func: string]: {
      callCount: number;
      syncTimeNano: number;
      asyncTimeNano: number;
    };
  };
  trackingFunctionStats: boolean;

  public functionCost: FunctionCostData | null = null;

  constructor(
    options: {
      trackingFunctionStats?: boolean;
      functionCost?: FunctionCostData;
      traceFunctions?: string[];
    } = {}
  ) {
    this.functions = {};
    this.functionProperties = {};
    this.statementFeatures = new Set();
    this.functionCost = options.functionCost || null;
    this.functionStats = options.trackingFunctionStats ? {} : null;
    this.trackingFunctionStats = options.trackingFunctionStats || false;

    if (options.traceFunctions) {
      throw new Error("traceFunctions is not implemented.");
    }
  }

  private wrapStatTracking(name, isAsync, wrapped) {
    invariant(
      typeof isAsync === "boolean",
      "Expected async boolean for function"
    );
    invariant(
      typeof wrapped === "function",
      "Expected function to enable stat tracking"
    );

    const stats = { callCount: 0, asyncTimeNano: 0, syncTimeNano: 0 };
    this.functionStats[name] = stats;

    if (isAsync) {
      return function() {
        const start = process.hrtime();
        const promise = wrapped.apply(null, arguments);
        return promise.then(rv => {
          stats.asyncTimeNano += hrtimeToNs(process.hrtime(start));
          stats.callCount += 1;
          return rv;
        });
      };
    } else {
      return function() {
        const start = process.hrtime();
        const rv = wrapped.apply(null, arguments);
        stats.syncTimeNano += hrtimeToNs(process.hrtime(start));
        stats.callCount += 1;
        return rv;
      };
    }
  }

  createStdlibRegistry(packageName: string) {
    return new StdlibRegistry(this, packageName);
  }

  getCost(funcName: string) {
    if (this.functionCost && this.functionCost.hasOwnProperty(funcName)) {
      return this.functionCost[funcName];
    } else {
      /**
       * If we have no cost data, we assume every function has equal cost.
       * In a production setting the cost data can be calculated from the
       * runtime and used to provide better estimates.
       */
      return 1;
    }
  }

  resetFunctionStats() {
    Object.values(this.functionStats).forEach(stats => {
      stats.callCount = 0;
      stats.asyncTimeNano = 0;
      stats.syncTimeNano = 0;
    });
  }

  has(name: string): boolean {
    return this.functionProperties.hasOwnProperty(name);
  }

  isStatement(name: string): boolean {
    return this.getProps(name).statement;
  }

  assertStatementAst(ast?) {
    sqrlInvariant(
      ast,
      ast.type === "call",
      "Expected function call for statement."
    );
    sqrlInvariant(
      ast,
      this.isStatement(ast.func),
      `Function ${ast.func} is not valid as a statement`
    );
  }

  statementFeature(name?) {
    const props = this.getProps(name);
    invariant(
      props.statementFeature,
      "Registered function does not have a defined feature:: %s",
      name
    );
    return props.statementFeature;
  }

  isAsync(name?) {
    return this.getProps(name).async;
  }

  getProps(name: string): FunctionProperties {
    invariant(this.has(name), "Function not registered:: %s", name);
    return this.functionProperties[name];
  }

  save(
    fn: (...args: any[]) => any | null,
    props: SaveFunctionProperties = {}
  ): void {
    const name = props.name || fn.name;

    if (typeof fn === "function") {
      invariant(
        !props.transformAst && !props.customTransform,
        "Functions cannot have both callback and transform: %s",
        name
      );
    }

    if (props.name && !props.name.startsWith("_")) {
      if (typeof props.argstring !== "string" || !props.docstring) {
        // tslint:disable-next-line:no-console
        console.error(
          "Warning: " + props.name + " is missing argstring and/or docstring"
        );
      }
    }

    let stateArg = false;
    let whenCauseArg = false;
    if (props.args) {
      let seenOptional = false;
      props.args.forEach((arg, idx) => {
        if (arg.isOptional) {
          seenOptional = true;
        } else {
          invariant(
            !seenOptional,
            "A non-optional argument cannot follow an optional one"
          );
        }

        if (arg.isRepeated) {
          invariant(
            idx === props.args.length - 1,
            "Repeated arguments are only valid as the final argument"
          );
        }

        if (arg instanceof StateArgument) {
          invariant(idx === 0, "State argument must be the first argument");
          stateArg = true;
        } else if (arg instanceof WhenCauseArgument) {
          invariant(
            idx === 1 && stateArg === true,
            "WhenCause argument must be the second argument, with state as the first"
          );
          whenCauseArg = true;
        }
      });
    }

    if (whenCauseArg) {
      invariant(
        props.allowNull,
        "allowNull should be set with whenCauseArg as the function may be called outside of a when block"
      );
    }

    invariant(
      typeof name === "string" && name.length > 0,
      "Expected function to be named; got:: ",
      name
    );
    invariant(
      !this.functions.hasOwnProperty(name),
      "Function already defined:: %s",
      name
    );
    if (props.pure) {
      invariant(!stateArg, "Pure functions cannot have a state argument");
    }

    if (props.statement && fn) {
      invariant(
        !!props.statementFeature,
        "statementFeature required for function %s",
        name
      );

      this.statementFeatures.add(props.statementFeature);
    }

    let isAsync;
    if (hasAsyncFunction && fn instanceof AsyncFunction) {
      invariant(
        props.async,
        "Async function was missing `async` property: " + name
      );
      fn = bluebird.method(fn);
      isAsync = true;
    } else {
      isAsync = !!props.async;
    }

    const promiseArgs = !!props.promiseArgs;
    if (promiseArgs) {
      invariant(isAsync === true, "promiseArgs requires async functions");
    }
    invariant(
      !props.callbackArgs || promiseArgs,
      "callbackArgs requires promiseArgs to be set"
    );

    let lazyArguments;
    if (props.callbackArgs || promiseArgs) {
      invariant(
        props.lazyArguments || !props.hasOwnProperty("lazyArguments"),
        "lazyArguments=false is not compatible with promise/callback arguments"
      );
      lazyArguments = true;
    } else {
      lazyArguments = !!props.lazyArguments;
    }

    if (fn !== null) {
      if (props.safe) {
        // There's very little use in declaring async functions as safe for optimisation reasons,
        // and all of the timeout logic is contained in the asyncSafetyNet
        invariant(
          props.asyncSafe || !isAsync,
          "Async functions should not be defined as safe"
        );
      } else {
        const safetyNetConfig: SafetyNetConfig = {
          stateArg,
          vital: !!props.vital
        };
        if (isAsync) {
          fn = asyncSafetyNet(name, fn, safetyNetConfig);
        } else {
          fn = syncSafetyNet(name, fn, safetyNetConfig);
        }
      }
    }

    const propsArgs = props.args;
    if (Array.isArray(propsArgs) && propsArgs.some(p => !!p.runtimeChecker)) {
      invariant(fn !== null, "Runtime type check not valid without callback");
      invariant(
        !props.transformAst && !props.customTransform,
        `Runtime type check not valid on transformAst func:: %s`,
        name
      );
      const wrapped = fn;
      fn = function(...args) {
        const errors = AT.validateRuntime(args, propsArgs);
        if (errors.length > 0) {
          if (stateArg) {
            args[0].logCodedErrorMessage(
              [
                `arg error calling ${name}`,
                ...errors.map(e => `arg ${e.index}: ${e.message}`)
              ].join("\n")
            );
          }

          if (isAsync) {
            return bluebird.resolve(null);
          } else {
            return null;
          }
        }
        return wrapped.call(null, ...args);
      };
    }

    if (!props.allowSqrlObjects && fn !== null) {
      invariant(promiseArgs === false, "promiseArgs requires allowSqrlObjects");
      const wrapped = fn;
      if (stateArg) {
        fn = function(state, ...args) {
          return wrapped.call(null, state, ...SqrlObject.ensureBasic(args));
        };
      } else {
        fn = function(...args) {
          return wrapped.apply(null, SqrlObject.ensureBasic(args));
        };
      }
    }

    if (!props.allowNull && fn !== null) {
      invariant(promiseArgs === false, "promiseArgs requires allowNull");

      const wrapped = fn;
      const nullValue = isAsync ? bluebird.resolve(null) : null;
      fn = function(...args) {
        for (const value of args) {
          if (value === null) {
            return nullValue;
          }
        }
        return wrapped.apply(null, args);
      };
    }

    this.pureFunction[name] = fn;

    if (this.trackingFunctionStats && fn !== null) {
      fn = this.wrapStatTracking(name, isAsync, fn);
    }

    if (props.background) {
      // This needs to be after wrapStatTracking() so that we see sync stats for
      // background functions.Because this uses nice() async required, but maybe
      // we can change that requirement later.
      invariant(!isAsync, "Background functions must be marked as sync");
      invariant(
        fn !== null,
        "Background functions must be provided a function"
      );
      const wrapped = fn;
      fn = function(...args) {
        return nice(() => wrapped.apply(null, args));
      };
      isAsync = true;
    }

    if (props.customTransform) {
      this.customFunctions.add(name);
    }

    /**
     * @todo: Tracing can be re-implemented later with a neater api
     * if (isAsync && stateArg && fn !== null && this.traceFunctions.has(name)) {
     *   const wrapped = fn;
     *   fn = function(state: SqrlExecutionState) {
     *     if (state.traceFunctions) {
     *       const childTrc = state.ctx.child("function-" + name);
     *       return childTrc.wrap(wrapped.apply(null, arguments));
     *     } else {
     *       return wrapped.apply(null, arguments);
     *     }
     *   };
     * }
     */

    this.functions[name] = fn;
    this.functionProperties[name] = Object.assign({}, props, {
      promiseArgs,
      lazyArguments,
      async: isAsync,
      stateArg,
      whenCauseArg
    });
  }
}
