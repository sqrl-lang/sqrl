/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
/**
 * The `expr` is an intermediate representation of compiled sqrl. It is
 * significantly simpler than the Ast and can be used to produce compiled code
 * for platforms other than JavaScript.
 */
import { Ast } from "./ast";

/**
 * Slots are the compile time representation of temporary values during compile time
 */
export interface Slot {
  readonly name: string;
  getIndex(): number;
  finalizedAst(): Ast;
}

export interface BaseExpr {
  load?: Slot[];
  exprs?: Expr[];
}

export interface LoadExpr extends BaseExpr {
  type: "load";
}
export interface ConstantExpr extends BaseExpr {
  type: "constant";
  value: any;
}
export interface ValueExpr extends BaseExpr {
  type: "value";
  slot: Slot;
}
export interface IteratorExpr extends BaseExpr {
  type: "iterator";
  name: string;
}
export interface StateExpr extends BaseExpr {
  type: "state";
}
export interface IfExpr extends BaseExpr {
  type: "if";
}
export interface CallExpr extends BaseExpr {
  type: "call";
  func: string;
}
export interface ListExpr extends BaseExpr {
  type: "list";
}
export interface InputExpr extends BaseExpr {
  type: "input";
}
export interface ListComprehensionExpr extends BaseExpr {
  type: "listComprehension";
  iterator: string;
}

export type Expr =
  | InputExpr
  | LoadExpr
  | ConstantExpr
  | ValueExpr
  | IteratorExpr
  | StateExpr
  | IfExpr
  | CallExpr
  | ListExpr
  | ListComprehensionExpr;

interface SerializedExpr {
  load: number[];
  exprs: SerializedExpr[];
  [key: string]: any;
}

export function serializeExpr(expr: Expr): SerializedExpr {
  return Object.assign({}, expr, {
    slot: (expr as any).slot ? (expr as any).slot.getIndex() : undefined,
    exprs: expr.exprs ? expr.exprs.map(serializeExpr) : undefined,
    load: expr.load ? expr.load.map(slot => slot.getIndex()) : undefined,
    location: undefined
  });
}
