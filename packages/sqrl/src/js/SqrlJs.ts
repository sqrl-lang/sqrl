/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import deepEqual from "../jslib/deepEqual";
import invariant from "../jslib/invariant";
import stringify = require("fast-stable-stringify");
import {
  Expr,
  ListComprehensionExpr,
  ConstantExpr,
  IfExpr,
  CallExpr
} from "../expr/Expr";
import FunctionRegistry from "../function/FunctionRegistry";

class ConstantJsExpr {
  usedPromise: boolean = false;
  constructor(public index: number, public value: any, public json: string) {}
  toPromiseString(): string {
    this.usedPromise = true;
    return `p${this.index}`;
  }
  toString(): string {
    return this.json;
  }
  toCallableString(): string {
    return `(()=>${this.toPromiseString()})`;
  }
}

class PromiseJsExpr {
  constructor(public expr: string) {}
  toString(): string {
    return this.expr;
  }
  static ensure(expr: JsExpr | JsExpr[]): PromiseJsExpr {
    if (expr instanceof PromiseJsExpr) {
      return expr;
    } else if (expr instanceof ConstantJsExpr) {
      return new PromiseJsExpr(expr.toPromiseString());
    } else if (Array.isArray(expr)) {
      // @NOTE: The `.map()` is not strictly required as values will be coerced
      // into promises, however that seems less safe than explicitly doing it.
      return new PromiseJsExpr(
        "bluebird.all([" + expr.map(PromiseJsExpr.ensure).join(",") + "])"
      );
    } else {
      return new PromiseJsExpr(`bluebird.resolve(${expr})`);
    }
  }
}

class FnCallExpr extends PromiseJsExpr {
  constructor(public index: number) {
    super(`f${index}()`);
  }
  toCallableString(): string {
    return `f${this.index}`;
  }
}

type JsExpr = PromiseJsExpr | ConstantJsExpr | string;

class JsState {
  functionsJs: string[];
  constants: ConstantJsExpr[];
  iterator: boolean;

  constructor(public functionRegistry: FunctionRegistry) {
    this.functionsJs = [];
    this.constants = [];
    this.iterator = false;
  }

  withIterator<T>(callback: () => T): T {
    invariant(!this.iterator, "Only single iterator supported");
    this.iterator = true;
    const result: T = callback();
    this.iterator = false;
    return result;
  }

  build(runJs) {
    return (
      "function(){" +
      this.constants
        .map(constant => {
          if (constant.usedPromise) {
            return `const p${constant.index}=bluebird.resolve(${
              constant.json
            });`;
          } else {
            return "";
          }
        })
        .join("") +
      this.functionsJs
        .map((js, idx) => {
          return `const f${idx}=${js};`;
        })
        .join("") +
      runJs +
      "}"
    );
  }

  buildExpr(expr: JsExpr): string {
    if (expr instanceof ConstantJsExpr) {
      return `function(){return bluebird.resolve(${expr.json});}`;
    }
    const exprJs = PromiseJsExpr.ensure(expr);
    return this.build(`return ${exprJs};`);
  }

  pushConstant(value) {
    const json = stringify(value);
    for (const constant of this.constants) {
      if (constant.json === json) {
        return constant;
      }
    }
    const obj = new ConstantJsExpr(this.constants.length, value, json);
    this.constants.push(obj);
    return obj;
  }

  _functionSource(source: string): FnCallExpr {
    let index = this.functionsJs.indexOf(source);
    if (index < 0) {
      this.functionsJs.push(source);
      index = this.functionsJs.length - 1;
    }
    return new FnCallExpr(index);
  }

  pushExprJs(expr: JsExpr): FnCallExpr | ConstantJsExpr {
    if (expr instanceof ConstantJsExpr) {
      return expr;
    }
    const params = this.iterator ? "it0" : "";
    return this._functionSource(`(${params})=>(${PromiseJsExpr.ensure(expr)})`);
  }
  pushFnJs(js: string): FnCallExpr {
    const params = this.iterator ? "it0" : "";
    return this._functionSource(`(${params})=>{${js}}`);
  }
}

function loadToJs(expr: Expr, state: JsState) {
  const loadAsSlots = expr.load.map(slot => ({
    slot,
    type: "value"
  }));
  const slots = expr.load.map(slot => slot.getIndex());
  const loadJson = JSON.stringify(slots);

  if (expr.exprs.length === 1) {
    const subexpr = expr.exprs[0];

    // Optimise loading of a single slot to just fetching that slot
    if (expr.load.length === 1 && deepEqual(subexpr, loadAsSlots[0])) {
      return new PromiseJsExpr(`this.fetch(${slots[0]})`);
    }

    // Simple list from different slots
    if (deepEqual(subexpr, { type: "list", exprs: loadAsSlots })) {
      return new PromiseJsExpr(`this.load(${loadJson})`);
    }

    // Simple function call from slots
    if (subexpr.type === "call") {
      if (
        deepEqual(subexpr, {
          exprs: loadAsSlots,
          func: subexpr.func
        })
      ) {
        if (expr.load.length === 1) {
          return new PromiseJsExpr(
            `this.fetch(${slots[0]}).then(functions.${subexpr.func})`
          );
        }
        return new PromiseJsExpr(
          `this.load(${loadJson}).spread(functions.${subexpr.func})`
        );
      }
    }
  }

  // @TODO: At some point we should handle more than one expression here
  invariant(expr.exprs.length === 1, "Expected single expression");

  const [subexpr] = expr.exprs.map(e => exprToJs(e, state));
  const fnCallJs = state.pushExprJs(subexpr).toCallableString();
  return new PromiseJsExpr(`this.load(${loadJson}).then(${fnCallJs})`);
}

function constantToJs(expr: ConstantExpr, state: JsState) {
  return state.pushConstant(expr.value);
}

function ifToJs(expr: IfExpr, state: JsState) {
  invariant(expr.exprs.length === 3, "Incorrect subexpr count");
  const subexprs = expr.exprs.map(e => exprToJs(e, state));

  const condition = subexprs[0];
  let trueBranch = subexprs[1];
  let falseBranch = subexprs[2];

  if (condition instanceof PromiseJsExpr) {
    return new PromiseJsExpr(
      `(${condition}).then(v=>functions.bool(v)?${trueBranch}:${falseBranch})`
    );
  } else if (
    trueBranch instanceof PromiseJsExpr ||
    falseBranch instanceof PromiseJsExpr
  ) {
    trueBranch = PromiseJsExpr.ensure(trueBranch);
    falseBranch = PromiseJsExpr.ensure(falseBranch);
    return new PromiseJsExpr(
      `(functions.bool(${condition})?${trueBranch}:${falseBranch})`
    );
  } else {
    return `(functions.bool(${condition})?${trueBranch}:${falseBranch})`;
  }
}

function callToJs(expr: CallExpr, state: JsState): JsExpr {
  const funcProps = state.functionRegistry.getProps(expr.func);
  const exprJs = expr.exprs.map(item => exprToJs(item, state));

  if (funcProps.callbackArgs === true) {
    invariant(
      exprJs.length >= 1 && exprJs[0] === "this",
      "Expected function taking promiseArgs to receive state as first argument"
    );
    const exprCallbackJs = exprJs.slice(1).map(expr => {
      return `()=>${PromiseJsExpr.ensure(expr)}`;
    });
    return new PromiseJsExpr(
      `functions.${expr.func}(this, [${exprCallbackJs.join(",")}])`
    );
  }

  if (funcProps.promiseArgs === true) {
    // Special behavior if we have a function that expects its arguments as
    // promises. It should require 'state', and then just ensure remaining
    // arguments are all promises.
    invariant(
      exprJs.length >= 1 && exprJs[0] === "this",
      "Expected function taking promiseArgs to receive state as first argument"
    );
    const promiseArgs = exprJs.slice(1).map(e => PromiseJsExpr.ensure(e));
    return new PromiseJsExpr(
      `functions.${expr.func}(this,${promiseArgs.join(",")})`
    );
  }

  const hasPromise = exprJs.some(expr => expr instanceof PromiseJsExpr);
  if (hasPromise) {
    if (exprJs.length === 1) {
      return new PromiseJsExpr(
        `${PromiseJsExpr.ensure(exprJs[0])}.then(functions.${expr.func})`
      );
    } else {
      return new PromiseJsExpr(
        `${PromiseJsExpr.ensure(exprJs)}.spread(functions.${expr.func})`
      );
    }
  } else if (funcProps.async) {
    return new PromiseJsExpr(`functions.${expr.func}(${exprJs.join(",")})`);
  } else {
    return `functions.${expr.func}(${exprJs.join(",")})`;
  }
}

function listToJs(expr: Expr, state: JsState): JsExpr {
  const exprJs = expr.exprs.map(item => exprToJs(item, state));
  const hasPromise = exprJs.some(
    (expr: JsExpr) => expr instanceof PromiseJsExpr
  );
  if (hasPromise) {
    return new PromiseJsExpr(`(${PromiseJsExpr.ensure(exprJs)})`);
  } else {
    return "[" + exprJs.join(",") + "]";
  }
}

function listComprehensionToJs(
  expr: ListComprehensionExpr,
  state: JsState
): JsExpr {
  const [input, output, where] = expr.exprs.map(i => exprToJs(i, state));
  const [outputFn, whereFn] = state.withIterator(() => {
    return [state.pushExprJs(output), state.pushExprJs(where)];
  });

  // If we have a constant where clause optimise that
  let whereString = whereFn.toCallableString();
  if (whereFn instanceof ConstantJsExpr) {
    if (!whereFn.value) {
      return state.pushConstant("[]");
    } else {
      whereString = "true";
    }
  }

  const args = [
    "this",
    JSON.stringify(expr.iterator),
    outputFn.toCallableString(),
    whereString
  ].join(",");
  if (input instanceof PromiseJsExpr) {
    return new PromiseJsExpr(
      `${PromiseJsExpr.ensure(
        input
      )}.then(v=>functions._listComprehension(${args},v))`
    );
  } else {
    return new PromiseJsExpr(`functions._listComprehension(${args},${input})`);
  }
}

function exprToJs(expr: Expr, state: JsState): JsExpr {
  if (expr.type === "load") {
    return loadToJs(expr, state);
  } else if (expr.type === "constant") {
    return constantToJs(expr, state);
  } else if (expr.type === "value") {
    return `this.slots[${expr.slot.getIndex()}].value()`;
  } else if (expr.type === "iterator") {
    return `it0`;
  } else if (expr.type === "state") {
    return "this";
  } else if (expr.type === "if") {
    return ifToJs(expr, state);
  } else if (expr.type === "call") {
    return callToJs(expr, state);
  } else if (expr.type === "list") {
    return listToJs(expr, state);
  } else if (expr.type === "listComprehension") {
    return listComprehensionToJs(expr, state);
  }
  throw new Error("Invalid sqrl expr.");
}

export const SqrlJs = {
  generateExpr(functionRegistry: FunctionRegistry, expr: Expr) {
    const state = new JsState(functionRegistry);
    const js = exprToJs(expr, state);
    return state.buildExpr(js);
  }
};
