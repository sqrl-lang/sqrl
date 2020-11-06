/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import SqrlAst from "./SqrlAst";

import { sqrlInvariant } from "../api/parse";
import { Ast, CallAst, ConstantAst } from "./Ast";
import { isValidFeatureName } from "../feature/FeatureName";
import mapToObj from "../jslib/mapToObj";
import SqrlEntity from "../object/SqrlEntity";
import { ensureArray } from "sqrl-common";
import {
  StateArgument,
  WhenCauseArgument,
  ArgumentCheck,
} from "./ArgumentCheck";

// @TODO: The types in this file are pretty tough
export type ArgsChecker = (ast: CallAst) => void;

export type CompileCheckCallback = (
  argAst: Ast,
  srcAst?: Ast,
  message?: string
) => void;

export interface RuntimeTypeChecker {
  isOptional: boolean;
  isRepeated: boolean;
  compileTimeCheck: CompileCheckCallback;
  runtimeChecker?: (value: any) => string | null;
}

export type AstArgs = RuntimeTypeChecker[];

/**
 * Type checker that already has a count (either optional, or repeated)
 */
export interface CountedTypeChecker extends RuntimeTypeChecker {
  array: RuntimeTypeChecker;
  bool: RuntimeTypeChecker;
  instanceOf: RuntimeTypeChecker;
  entityId: RuntimeTypeChecker;
  number: RuntimeTypeChecker;
  object: RuntimeTypeChecker;
  sqrlEntity: RuntimeTypeChecker;
  sqrlEntityOrEntities: RuntimeTypeChecker;

  sqrlGeoPoint: RuntimeTypeChecker;
  string: RuntimeTypeChecker;
}

export interface TypeChecker extends CountedTypeChecker {
  optional: TypeChecker;
  repeated: TypeChecker;
}

const pluralize = (text, count: number) =>
  `${count} ${text}` + (count === 1 ? "" : "s");

/* Type validation for Sqrl Functions

Runs in two passes, compile time checks and runtime checks.

  args: [ AT.string ]              // Required compile time arg
  args: [ AT.string.optional ]     // Optional compile time arg
  args: [ AT.any.string ]          // Anything at compile time, string at runtime
  args: [ AT.any.optional.string ] // Optional arg, anything at compile time, string at runtime
  args: [ AT.any.optional.SqrlEntity ] // Optional arg, anything at compile time, string at runtime

*/

const runtimeCheckers = {
  array: ensureRuntime(Array.isArray, `expected array`),
  boolean: ensureRuntimeTypeOf("boolean"),
  instanceOf: ensureRuntimeInstanceOf,
  number: ensureRuntimeTypeOf("number"),
  object: ensureRuntimeTypeOf("object"),
  sqrlEntity: ensureRuntimeInstanceOf(SqrlEntity),
  sqrlEntityOrEntities: ensureRuntimeInstanceOf(SqrlEntity, true),
  string: ensureRuntimeTypeOf("string"),
};

const compileCheckers = {
  any: typeChecker(() => true),
  constant: {
    array: ensureConstant("array", (ast) => Array.isArray(ast.value)),
    boolean: constantType("boolean"),
    number: constantNumber(),
    string: constantType("string"),
    value: constantValue,
    null: constantValue(null),
    featurePath: ensureConstant("feature name", (ast?) =>
      isValidFeatureName(ast.value)
    ),
    objectKeys: typeChecker(ensureObjectWithConstantKeys),

    // @TODO: constant.object only ensures that the object keys are constant,
    // not that the entire object is constant.
    object: typeChecker(ensureObjectWithConstantKeys),
  },
  feature: ensureAstType("feature"),
  list: ensureAstType("list"),
  state: new StateArgument(),
  whenCause: new WhenCauseArgument(),
  custom: typeChecker,

  compileTypesInvariant,
  validateRuntime,
};

function ensure(message, checker) {
  return typeChecker((argAst, srcAst?: Ast, typeMessage?: string) => {
    sqrlInvariant(
      argAst || srcAst,
      checker(argAst),
      typeMessage || `Expected argument to ${message}`
    );
  });
}

function ensureRuntime(matcher, message) {
  return (actual?) => (matcher(actual) ? null : message);
}

function ensureRuntimeTypeOf(expected?) {
  return (actual?) => {
    const t = typeof actual;
    return t === expected ? null : `Expected type ${expected} but was ${t}`;
  };
}

function ensureRuntimeInstanceOf(expected, allowArray: boolean = false) {
  return (actual) => {
    if (!allowArray && Array.isArray(actual)) {
      return `Expected instance of ${expected.name}, saw array`;
    }

    for (const instance of ensureArray(actual)) {
      if (!(instance instanceof expected)) {
        return `Expected instance of ${expected.name}`;
      }
    }
    return null;
  };
}

function ensureAstType(type?) {
  return ensure(`be of type ${type}`, (ast?) => ast && ast.type === type);
}

function ensureConstant(message, checker: (ast: ConstantAst) => boolean) {
  return ensure(
    `be a constant ${message}`,
    (ast?) => ast && ast.type === "constant" && checker(ast)
  );
}

function constantNumber() {
  return Object.assign(constantType("number"), {
    gt: (expected?) =>
      ensureConstant(
        `number > ${expected}`,
        (ast?) => typeof ast.value === "number" && ast.value > expected
      ),
    lt: (expected?) =>
      ensureConstant(
        `number < ${expected}`,
        (ast?) => typeof ast.value === "number" && ast.value < expected
      ),
  });
}

function constantType(type?) {
  return ensureConstant(`${type}`, (ast?) => typeof ast.value === type);
}

function constantValue(val?) {
  return ensureConstant(`value == ${val}`, (ast?) => ast.value === val);
}

function ensureObjectWithConstantKeys(ast?) {
  sqrlInvariant(
    ast,
    ast && SqrlAst.isSimpleDataObject(ast),
    "Expected argument to be object with constant keys"
  );
  if (ast.type === "constant" && typeof ast.value === "object") {
    return Object.keys(ast.value);
  }

  const keys = [];
  for (let idx = 0; idx < ast.args.length; idx += 2) {
    const arg = ast.args[idx];
    sqrlInvariant(
      arg,
      arg.type === "constant" && typeof arg.value === "string",
      "Expected constant string key for object here"
    );
    keys.push(arg.value);
  }
  return keys;
}

function compileTypesInvariant(fnAst: CallAst, types: ArgumentCheck[]) {
  const { args } = fnAst;

  const providedArgs = args.length;
  const repeatedLast = types.length && types[types.length - 1].isRepeated;
  const optArgs = types.filter((t) => t.isOptional).length;
  const maxArgs = repeatedLast ? providedArgs : types.length;
  const minArgs = types.length - optArgs;

  let lengthMessage: string;
  if (repeatedLast) {
    lengthMessage = `at least ${pluralize("argument", minArgs)}`;
  } else if (minArgs === maxArgs) {
    lengthMessage = `${pluralize("argument", minArgs)}`;
  } else {
    lengthMessage = `${minArgs} to ${pluralize("argument", maxArgs)}`;
  }

  sqrlInvariant(
    fnAst,
    providedArgs >= minArgs && providedArgs <= maxArgs,
    `Argument count to call of ${fnAst.func} did not match. ` +
      `Expected ${lengthMessage} but got ${providedArgs}.`
  );

  for (let i = 0; i < types.length; i++) {
    // The last field may have a repeated checker on it
    const checker: ArgumentCheck = types[Math.min(i, types.length - 1)];

    checker.compileTimeCheck(args[i], fnAst);
  }
}

function validateRuntime(fnArgs: any[], types: ArgumentCheck[]) {
  let errors = [];
  for (let i = 0; i < fnArgs.length; i++) {
    // The last field may have a repeated checker on it
    const checker = types[Math.min(i, types.length - 1)];

    const error = checker.runtimeChecker && checker.runtimeChecker(fnArgs[i]);
    if (error) {
      errors = [
        ...errors,
        {
          index: i,
          value: fnArgs[i],
          type: checker,
          message: error,
        },
      ];
    }
  }
  return errors;
}

function createRuntimeCheckers(
  compileTimeCheck: CompileCheckCallback,
  isOptional: boolean,
  isRepeated: boolean
) {
  return Object.assign(
    {
      compileTimeCheck,
      isOptional,
      isRepeated,
    },
    mapToObj(Object.keys(runtimeCheckers), (k?) => ({
      compileTimeCheck,
      runtimeChecker: runtimeCheckers[k],
      isOptional,
      isRepeated,
    }))
  );
}

function typeChecker(compileTimeCheck: CompileCheckCallback): TypeChecker {
  const o = createRuntimeCheckers(compileTimeCheck, false, false);
  o.optional = createRuntimeCheckers(compileTimeCheck, true, false);
  o.repeated = createRuntimeCheckers(compileTimeCheck, false, true);
  o.optional.repeated = createRuntimeCheckers(compileTimeCheck, true, true);
  o.repeated.optional = o.optional.repeated;
  return o;
}

const AstTypes = compileCheckers;
export { AstTypes };
