/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import SqrlAst from "./SqrlAst";

import { sqrlInvariant } from "../api/parse";
import { Ast, CallAst } from "./Ast";
import { isValidFeatureName } from "../feature/FeatureName";
import mapToObj from "../jslib/mapToObj";
import SqrlNode from "../object/SqrlNode";
import { ensureArray } from "../jslib/ensureArray";

// @TODO: The types in this file are pretty tough
export type ArgsChecker = (ast: CallAst) => void;

export interface CompileChecker {
  (argAst: Ast, srcAst?: Ast, message?: string): void;

  isStateArg?: boolean;
}

export type SpecialArgType = "state" | "whenContext";
export const SPECIAL_ARG_TYPES = {
  state: "state",
  whenContext: "whenContext"
};

export interface RuntimeTypeChecker {
  compileChecker: CompileChecker;
  runtimeChecker?: (value: any) => string | null;
  specialArgType?: SpecialArgType;
}

export type AstArgs = ArgsChecker | RuntimeTypeChecker[];

export interface OptionalTypeChecker extends RuntimeTypeChecker {
  array: RuntimeTypeChecker;
  bool: RuntimeTypeChecker;
  instanceOf: RuntimeTypeChecker;
  nodeId: RuntimeTypeChecker;
  number: RuntimeTypeChecker;
  object: RuntimeTypeChecker;
  sqrlNode: RuntimeTypeChecker;
  sqrlNodeOrArray: RuntimeTypeChecker;
  sqrlGeoPoint: RuntimeTypeChecker;
  string: RuntimeTypeChecker;
}

export interface TypeChecker extends OptionalTypeChecker {
  optional: OptionalTypeChecker;
}

const pluralize = (text, count: number) =>
  `${count} ${text}` + (count === 1 ? "" : "s");

/* Type validation for Sqrl Functions

Runs in two passes, compile time checks and runtime checks.

  args: [ AT.string ]              // Required compile time arg
  args: [ AT.string.optional ]     // Optional compile time arg
  args: [ AT.any.string ]          // Anything at compile time, string at runtime
  args: [ AT.any.optional.string ] // Optional arg, anything at compile time, string at runtime
  args: [ AT.any.optional.sqrlNode ] // Optional arg, anything at compile time, string at runtime

*/

const runtimeCheckers = {
  array: ensureRuntime(Array.isArray, `expected array`),
  bool: ensureRuntimeTypeOf("boolean"),
  instanceOf: ensureRuntimeInstanceOf,
  number: ensureRuntimeTypeOf("number"),
  object: ensureRuntimeTypeOf("object"),
  sqrlNode: ensureRuntimeInstanceOf(SqrlNode),
  sqrlNodeOrArray: ensureRuntimeInstanceOf(SqrlNode, true),
  string: ensureRuntimeTypeOf("string")
};

const compileCheckers = {
  any: typeChecker(() => true),
  constant: {
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
    object: typeChecker(ensureObjectWithConstantKeys)
  },
  feature: ensureAstType("feature"),
  list: ensureAstType("list"),
  state: createSpecialArg("state"),
  whenContext: createSpecialArg("whenContext"),
  custom: typeChecker,

  compileTypesInvariant,
  validateRuntime
};

function createSpecialArg(type: SpecialArgType) {
  const fn = typeChecker(() => true);
  fn.specialArgType = type;
  return fn;
}

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
  return actual => {
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

function ensureConstant(message, checker) {
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
      )
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

function compileTypesInvariant(fnAst: CallAst, types: any) {
  const { args } = fnAst;

  if (!Array.isArray(types)) {
    return types(fnAst);
  }

  const optArgs = types.filter(t => t._optional).length;
  const maxArgs = types.length;
  const minArgs = maxArgs - optArgs;
  const providedArgs = args.length;

  const lengthMessage =
    minArgs === maxArgs
      ? `${pluralize("argument", minArgs)}`
      : `${minArgs} to ${pluralize("argument", maxArgs)}`;

  sqrlInvariant(
    fnAst,
    providedArgs >= minArgs && providedArgs <= maxArgs,
    `Argument count to call of ${fnAst.func} did not match. ` +
      `Expected ${lengthMessage} but got ${providedArgs}.`
  );

  for (let i = 0; i < types.length; i++) {
    const checker = types[i];
    checker.compileChecker(args[i], fnAst);
  }
}

function validateRuntime(fnArgs: any[], types: RuntimeTypeChecker[]) {
  let errors = [];
  for (let i = 0; i < fnArgs.length; i++) {
    const checker = types[i];
    const error = checker.runtimeChecker && checker.runtimeChecker(fnArgs[i]);
    if (error) {
      errors = [
        ...errors,
        {
          index: i,
          value: fnArgs[i],
          type: checker,
          message: error
        }
      ];
    }
  }
  return errors;
}

function createRuntimeCheckers(compileChecker: CompileChecker, _optional) {
  return mapToObj(Object.keys(runtimeCheckers), (k?) => ({
    compileChecker,
    runtimeChecker: runtimeCheckers[k],
    _optional
  }));
}

function typeChecker(compileChecker: CompileChecker): TypeChecker {
  const o = Object.assign(
    {
      compileChecker,
      _optional: false
    },
    createRuntimeCheckers(compileChecker, false)
  );

  o.optional = Object.assign(
    {},
    o,
    { _optional: true },
    createRuntimeCheckers(compileChecker, true)
  );

  return o;
}

function minArgs(count?) {
  return (ast?) =>
    sqrlInvariant(
      ast.args,
      ast.args.length >= count,
      `${ast.func}() requires atleast two arguments`
    );
}
const AT = Object.assign(compileCheckers, {
  minArgs
});

export default AT;
